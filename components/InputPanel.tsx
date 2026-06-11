"use client";

import { type RefObject, useEffect, useRef, useState } from "react";
import JsonEditor, { type JsonEditorHandle } from "./JsonEditor";
import WorkspaceTabs from "./WorkspaceTabs";
import ZoomControls from "./ZoomControls";
import { ConsolePanel, useConsole } from "./console";
import { validate } from "@/lib/json/validate";
import type { Workspace } from "@/lib/persist";

const ZOOM_KEY = "editor:fontSize";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onReset: (v: string) => void;
  editorRef?: RefObject<JsonEditorHandle | null>;
  // Workspace tab bar
  workspaces: Workspace[];
  activeId: string;
  onSwitchWorkspace: (id: string) => void;
  onAddWorkspace: () => void;
  onCloseWorkspace: (id: string) => void;
  onRenameWorkspace: (id: string, name: string) => void;
}

/**
 * The single working-document section: the workspace tab bar, the editor, and a
 * resizable error console below. Validation results go to the console (no inline
 * markers); document actions live in each tool's control row.
 */
export default function InputPanel({
  value,
  onChange,
  onReset,
  editorRef,
  workspaces,
  activeId,
  onSwitchWorkspace,
  onAddWorkspace,
  onCloseWorkspace,
  onRenameWorkspace,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const [fontSize, setFontSize] = useState(13);
  const { push, clearSource } = useConsole();
  const prevMsg = useRef<string | null>(null);

  // Restore / persist editor zoom.
  useEffect(() => {
    const s = Number(localStorage.getItem(ZOOM_KEY));
    if (s) setFontSize(Math.min(28, Math.max(9, s)));
  }, []);
  function changeZoom(n: number) {
    setFontSize(n);
    localStorage.setItem(ZOOM_KEY, String(n));
  }

  // Report the current validation error to the console; clear it once fixed.
  useEffect(() => {
    const r = value.trim() === "" ? { ok: true as const } : validate(value);
    if (r.ok) {
      if (prevMsg.current !== null) {
        clearSource("validate"); // error resolved → remove it
        prevMsg.current = null;
      }
    } else if (prevMsg.current !== r.error.message) {
      clearSource("validate"); // replace any stale error
      push("error", r.error.message, "validate");
      prevMsg.current = r.error.message;
    }
  }, [value, push, clearSource]);

  function loadFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => onReset(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  return (
    <div
      className="relative flex h-full min-h-0 flex-col"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) loadFile(file);
      }}
    >
      {/* Workspace tabs (this row is exclusive to tabs) */}
      <div className="border-b border-border">
        <WorkspaceTabs
          workspaces={workspaces}
          activeId={activeId}
          onSwitch={onSwitchWorkspace}
          onAdd={onAddWorkspace}
          onClose={onCloseWorkspace}
          onRename={onRenameWorkspace}
        />
      </div>

      {/* Editor */}
      <div className="relative min-h-0 flex-1">
        <JsonEditor
          ref={editorRef}
          value={value}
          onChange={onChange}
          fontSize={fontSize}
          placeholder="Paste or drop JSON here…"
        />
        <div className="absolute bottom-2 right-3 z-10 rounded-md border border-border bg-bg-soft/90 px-1 py-0.5 opacity-60 shadow-sm backdrop-blur transition-opacity hover:opacity-100">
          <ZoomControls size={fontSize} setSize={changeZoom} />
        </div>
      </div>

      {/* Error console */}
      <ConsolePanel />

      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center border-2 border-dashed border-accent bg-bg/80 text-sm text-accent">
          Drop a .json file to load
        </div>
      )}
    </div>
  );
}
