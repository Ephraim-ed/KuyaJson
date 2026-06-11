"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import InputPanel from "@/components/InputPanel";
import TreeSidebar from "@/components/TreeSidebar";
import Split from "@/components/Split";
import Tooltip from "@/components/Tooltip";
import QueryModal from "@/components/QueryModal";
import { ConsoleProvider } from "@/components/console";
import { DocumentActionsProvider } from "@/components/DocumentActions";
import { Button, ToastProvider } from "@/components/ui";
import type { JsonEditorHandle } from "@/components/JsonEditor";
import { TOOLS } from "@/components/tools/registry";
import type { ToolId } from "@/components/tools/types";
import { useHistory } from "@/lib/history";
import { locateAll } from "@/lib/json/locate";
import {
  loadState,
  saveState,
  uuid,
  type Workspace,
} from "@/lib/persist";

const ToolHost = dynamic(() => import("@/components/ToolHost"), { ssr: false });

/** True when the viewport is at the `lg` breakpoint (1024px) or wider. */
function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}

export default function Page() {
  const history = useHistory("");
  const [active, setActive] = useState<ToolId>("format");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);
  const [queryOpen, setQueryOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const inputEditor = useRef<JsonEditorHandle | null>(null);

  const tool = TOOLS.find((t) => t.id === active)!;
  const showTree = !tool.ownInput; // Diff manages its own inputs.
  const isDesktop = useIsDesktop();

  const locations = useMemo(() => locateAll(history.value), [history.value]);

  const onSelectPath = useCallback(
    (path: string) => {
      setSelectedPath(path);
      const range = locations.get(path);
      if (range) inputEditor.current?.focusRange(range.from, range.to);
      setMobileTreeOpen(false);
    },
    [locations],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === "k") {
        e.preventDefault();
        setQueryOpen((o) => !o);
      } else if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        history.undo();
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        e.preventDefault();
        history.redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [history]);

  // Restore workspaces (or migrate the old single-doc localStorage) on load.
  const loaded = useRef(false);
  useEffect(() => {
    (async () => {
      let state = await loadState();
      if (!state || state.workspaces.length === 0) {
        let content = "";
        let tool = "format";
        try {
          content = localStorage.getItem("kuya-json:doc") ?? "";
          tool = localStorage.getItem("kuya-json:tool") ?? "format";
        } catch {
          /* no legacy data */
        }
        const id = uuid();
        state = {
          workspaces: [{ id, name: "Workspace 1", content }],
          activeId: id,
          activeTool: tool,
        };
      }
      setWorkspaces(state.workspaces);
      setActiveId(state.activeId);
      if (TOOLS.some((t) => t.id === state.activeTool)) {
        setActive(state.activeTool as ToolId);
      }
      const current =
        state.workspaces.find((w) => w.id === state.activeId) ??
        state.workspaces[0];
      history.reset(current?.content ?? "");
      loaded.current = true;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the active workspace's content in sync with the editor.
  useEffect(() => {
    if (!loaded.current) return;
    setWorkspaces((ws) =>
      ws.map((w) =>
        w.id === activeId && w.content !== history.value
          ? { ...w, content: history.value }
          : w,
      ),
    );
  }, [history.value, activeId]);

  // Persist everything (debounced) to IndexedDB.
  useEffect(() => {
    if (!loaded.current || workspaces.length === 0) return;
    const id = window.setTimeout(() => {
      saveState({ workspaces, activeId, activeTool: active });
    }, 400);
    return () => window.clearTimeout(id);
  }, [workspaces, activeId, active]);

  // --- workspace actions ---
  const switchWorkspace = useCallback(
    (id: string) => {
      if (id === activeId) return;
      const w = workspaces.find((x) => x.id === id);
      setActiveId(id);
      history.reset(w?.content ?? "");
      setSelectedPath(null);
    },
    [activeId, workspaces, history],
  );

  const addWorkspace = useCallback(() => {
    const id = uuid();
    setWorkspaces((ws) => [
      ...ws,
      { id, name: `Workspace ${ws.length + 1}`, content: "" },
    ]);
    setActiveId(id);
    history.reset("");
    setSelectedPath(null);
  }, [history]);

  const closeWorkspace = useCallback(
    (id: string) => {
      const idx = workspaces.findIndex((w) => w.id === id);
      const remaining = workspaces.filter((w) => w.id !== id);
      if (remaining.length === 0) {
        const nid = uuid();
        const fresh = { id: nid, name: "Workspace 1", content: "" };
        setWorkspaces([fresh]);
        setActiveId(nid);
        history.reset("");
        return;
      }
      setWorkspaces(remaining);
      if (id === activeId) {
        const next = remaining[Math.max(0, idx - 1)] ?? remaining[0];
        setActiveId(next.id);
        history.reset(next.content);
        setSelectedPath(null);
      }
    },
    [workspaces, activeId, history],
  );

  const renameWorkspace = useCallback((id: string, name: string) => {
    setWorkspaces((ws) => ws.map((w) => (w.id === id ? { ...w, name } : w)));
  }, []);

  // The single shared document editor (with tabs + console), reused by tools.
  const documentEditor = (
    <InputPanel
      value={history.value}
      onChange={history.replace}
      onReset={history.set}
      editorRef={inputEditor}
      workspaces={workspaces}
      activeId={activeId}
      onSwitchWorkspace={switchWorkspace}
      onAddWorkspace={addWorkspace}
      onCloseWorkspace={closeWorkspace}
      onRenameWorkspace={renameWorkspace}
    />
  );

  const workspace = (
    <ToolHost
      id={active}
      input={history.value}
      setInput={history.set}
      editor={documentEditor}
    />
  );

  return (
    <ToastProvider>
      <ConsoleProvider>
      <DocumentActionsProvider
        value={{
          value: history.value,
          onReset: history.set,
          onUndo: history.undo,
          onRedo: history.redo,
          canUndo: history.canUndo,
          canRedo: history.canRedo,
        }}
      >
      <div className="flex h-screen flex-col">
        <Header
          active={active}
          onSelect={setActive}
          showTreeToggle={showTree}
          onToggleTree={() => setMobileTreeOpen((o) => !o)}
          onOpenQuery={() => setQueryOpen(true)}
        />

        <main className="relative min-h-0 flex-1 overflow-hidden">
          {/* Mobile tree drawer */}
          {showTree && mobileTreeOpen && (
            <>
              <div
                className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                onClick={() => setMobileTreeOpen(false)}
              />
              <aside className="fixed inset-y-0 left-0 z-40 w-72 border-r border-border shadow-xl lg:hidden">
                <TreeSidebar
                  input={history.value}
                  selectedPath={selectedPath}
                  onSelect={onSelectPath}
                  onClose={() => setMobileTreeOpen(false)}
                />
              </aside>
            </>
          )}

          {/* Desktop: resizable [tree | workspace]; mobile: workspace only.
              Rendered via JS breakpoint so the workspace mounts exactly once. */}
          {showTree && isDesktop ? (
            <Split
              direction="horizontal"
              initial={0.2}
              min={0.1}
              max={0.45}
              storageKey="sidebar"
              first={
                <TreeSidebar
                  input={history.value}
                  selectedPath={selectedPath}
                  onSelect={onSelectPath}
                />
              }
              second={workspace}
            />
          ) : (
            <div className="h-full">{workspace}</div>
          )}
        </main>
      </div>

      <QueryModal
        input={history.value}
        open={queryOpen}
        onClose={() => setQueryOpen(false)}
        onSelectPath={onSelectPath}
      />
      </DocumentActionsProvider>
      </ConsoleProvider>
    </ToastProvider>
  );
}

function Header({
  active,
  onSelect,
  showTreeToggle,
  onToggleTree,
  onOpenQuery,
}: {
  active: ToolId;
  onSelect: (id: ToolId) => void;
  showTreeToggle: boolean;
  onToggleTree: () => void;
  onOpenQuery: () => void;
}) {
  return (
    <header className="flex shrink-0 flex-col gap-2 border-b border-border bg-bg-soft px-3 py-2 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2">
        {showTreeToggle && (
          <button
            onClick={onToggleTree}
            className="rounded-md border border-border px-2 py-1 text-sm text-gray-300 hover:bg-bg-softer lg:hidden"
            aria-label="Toggle tree"
            title="Toggle structure tree"
          >
            ☰
          </button>
        )}
        <span className="flex h-6 items-center justify-center rounded-md bg-accent px-1.5 font-mono text-sm font-bold text-white">
          {"{J}"}
        </span>
        <span className="text-base font-semibold text-gray-100">Kuya Json</span>
        <span className="hidden text-xs text-gray-500 lg:inline">
          · built by ep
        </span>
      </div>

      <div className="flex items-center gap-2 sm:ml-auto">
        <nav className="hidden gap-1 overflow-x-auto sm:flex">
          {TOOLS.map((t) => (
            <Tooltip key={t.id} text={t.info}>
              <button
                onClick={() => onSelect(t.id)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active === t.id
                    ? "bg-accent text-white"
                    : "text-gray-400 hover:bg-bg-softer hover:text-gray-200"
                }`}
              >
                {t.label}
              </button>
            </Tooltip>
          ))}
        </nav>

        <select
          value={active}
          onChange={(e) => onSelect(e.target.value as ToolId)}
          className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-gray-200 sm:hidden"
        >
          {TOOLS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>

        <Button onClick={onOpenQuery} title="Search / query (⌘K)">
          <span className="hidden sm:inline">Search</span>
          <span className="sm:hidden">🔍</span>
          <kbd className="ml-1 hidden rounded bg-bg px-1 text-[10px] text-gray-500 lg:inline">
            ⌘K
          </kbd>
        </Button>
      </div>
    </header>
  );
}
