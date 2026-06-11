"use client";

import { useEffect, useRef, useState } from "react";
import type { Workspace } from "@/lib/persist";

interface Props {
  workspaces: Workspace[];
  activeId: string;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onClose: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export default function WorkspaceTabs({
  workspaces,
  activeId,
  onSwitch,
  onAdd,
  onClose,
  onRename,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingId) inputRef.current?.select();
  }, [editingId]);

  // Mouse-wheel (vertical) scrolls the tab row horizontally.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return; // nothing to scroll
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // let real horizontal pass
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function startRename(w: Workspace) {
    setEditingId(w.id);
    setDraft(w.name);
  }
  function commit() {
    if (editingId) onRename(editingId, draft.trim() || "Untitled");
    setEditingId(null);
  }

  return (
    <div
      ref={scrollRef}
      className="flex items-end gap-1 overflow-x-auto overflow-y-hidden bg-bg px-2 pt-1.5"
    >
      {workspaces.map((w) => {
        const active = w.id === activeId;
        return (
          <div
            key={w.id}
            onClick={() => onSwitch(w.id)}
            onDoubleClick={() => startRename(w)}
            title={`${w.name} — double-click to rename`}
            className={`group relative flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-t-lg px-3 text-xs transition-colors ${
              active
                ? "ctab-active z-10 -mb-px bg-bg-softer text-gray-100"
                : "bg-transparent text-gray-400 hover:bg-bg-soft hover:text-gray-200"
            }`}
          >
            <span
              className={`shrink-0 font-mono text-[11px] ${
                active ? "text-blue-600 dark:text-yellow-400" : "text-gray-500"
              }`}
            >
              {"{ }"}
            </span>
            {editingId === w.id ? (
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit();
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="w-24 rounded border border-accent bg-bg px-1 text-xs text-gray-100 focus:outline-none"
              />
            ) : (
              <span className="max-w-[150px] truncate">{w.name}</span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(w.id);
              }}
              title="Close workspace"
              className={`flex h-4 w-4 items-center justify-center rounded-full text-gray-500 hover:bg-bg hover:text-red-300 ${
                active ? "" : "opacity-0 group-hover:opacity-100"
              }`}
            >
              ✕
            </button>
          </div>
        );
      })}
      <button
        onClick={() => onAdd()}
        title="New workspace"
        className="mb-1 ml-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-base text-gray-400 hover:bg-bg-soft hover:text-gray-200"
      >
        +
      </button>
    </div>
  );
}
