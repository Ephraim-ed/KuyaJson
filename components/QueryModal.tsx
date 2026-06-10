"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Banner, Button } from "./ui";
import { validate } from "@/lib/json/validate";
import { queryJsonPath, searchText } from "@/lib/json/query";

type Mode = "jsonpath" | "text";
const PRESETS = ["$..email", "$..*", "$.*", "$..[?(@.id)]"];

interface Props {
  input: string;
  open: boolean;
  onClose: () => void;
  /** Focus a path in the document editor (mirrors the tree's behaviour). */
  onSelectPath?: (path: string) => void;
}

export default function QueryModal({ input, open, onClose, onSelectPath }: Props) {
  const [mode, setMode] = useState<Mode>("jsonpath");
  const [expr, setExpr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => validate(input), [input]);
  const result = useMemo(() => {
    if (!parsed.ok) return null;
    return mode === "jsonpath"
      ? queryJsonPath(parsed.value, expr)
      : searchText(parsed.value, expr);
  }, [parsed, mode, expr]);

  // Focus the field and allow Esc to close when opened.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[8vh]"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-bg-soft shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border p-3">
          <Button active={mode === "jsonpath"} onClick={() => setMode("jsonpath")}>
            JSONPath
          </Button>
          <Button active={mode === "text"} onClick={() => setMode("text")}>
            Text search
          </Button>
          <button
            onClick={onClose}
            className="ml-auto px-2 text-gray-400 hover:text-gray-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2 border-b border-border p-3">
          <input
            ref={inputRef}
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            placeholder={mode === "jsonpath" ? "$..email" : "search keys & values"}
            className="w-full rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-accent"
          />
          {mode === "jsonpath" && (
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setExpr(p)}
                  className="rounded bg-bg px-2 py-0.5 font-mono text-xs text-gray-400 hover:bg-bg-softer hover:text-gray-200"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          {!parsed.ok && input.trim() !== "" && (
            <Banner kind="error">{parsed.error.message}</Banner>
          )}
          {result && !result.ok && <Banner kind="error">{result.error}</Banner>}
          {result && result.ok && expr.trim() !== "" && (
            <p className="text-xs text-gray-500">{result.matches.length} match(es)</p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-2">
          {result && result.ok && result.matches.length > 0 ? (
            <ul className="space-y-1">
              {result.matches.map((m, i) => (
                <li key={i}>
                  <button
                    onClick={() => {
                      onSelectPath?.(m.path);
                      onClose();
                    }}
                    className="block w-full rounded px-2 py-1 text-left hover:bg-bg-softer"
                  >
                    <span className="font-mono text-xs text-sky-300">{m.path}</span>
                    <span className="ml-2 font-mono text-xs text-gray-400">
                      {preview(m.value)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-3 text-sm text-gray-600">
              {expr.trim() === ""
                ? "Type a JSONPath expression or search term. Click a result to jump to it."
                : "No matches."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function preview(v: unknown): string {
  const s = typeof v === "string" ? `"${v}"` : JSON.stringify(v);
  if (!s) return "";
  return s.length > 80 ? s.slice(0, 77) + "…" : s;
}
