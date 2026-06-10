"use client";

import { type RefObject, useMemo, useRef, useState } from "react";
import JsonEditor, {
  type EditorMarker,
  type JsonEditorHandle,
} from "./JsonEditor";
import { Button } from "./ui";
import { SAMPLE_JSON } from "@/lib/sample";
import { validate } from "@/lib/json/validate";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onReset: (v: string) => void;
  editorRef?: RefObject<JsonEditorHandle | null>;
}

/**
 * The single working-document editor. Holds the JSON that every tool reads and
 * transforms in place. Shows live inline validation errors and document actions
 * (undo/redo, load file, sample, clear, drag-and-drop).
 */
export default function InputPanel({
  value,
  onChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onReset,
  editorRef,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Live validation → inline error marker.
  const markers: EditorMarker[] = useMemo(() => {
    if (value.trim() === "") return [];
    const r = validate(value);
    if (r.ok || r.error.position == null) return [];
    return [
      {
        from: Math.max(0, r.error.position - 1),
        to: r.error.position + 1,
        message: r.error.message,
        severity: "error",
      },
    ];
  }, [value]);

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
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-2 py-1.5">
        <span className="px-1 text-xs font-medium uppercase tracking-wide text-gray-500">
          Document
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <Button onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl/Cmd+Z)">
            ↶
          </Button>
          <Button onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl/Cmd+Shift+Z)">
            ↷
          </Button>
          <Button onClick={() => fileRef.current?.click()} title="Load a .json file">
            Load
          </Button>
          <Button onClick={() => onReset(SAMPLE_JSON)} title="Insert sample JSON">
            Sample
          </Button>
          <Button
            variant="danger"
            onClick={() => onReset("")}
            disabled={!value}
            title="Clear"
          >
            Clear
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.txt,application/json,text/plain"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) loadFile(file);
            e.target.value = "";
          }}
        />
      </div>

      <div className="min-h-0 flex-1">
        <JsonEditor
          ref={editorRef}
          value={value}
          onChange={onChange}
          markers={markers}
          placeholder="Paste or drop JSON here…"
        />
      </div>

      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center border-2 border-dashed border-accent bg-bg/80 text-sm text-accent">
          Drop a .json file to load
        </div>
      )}
    </div>
  );
}
