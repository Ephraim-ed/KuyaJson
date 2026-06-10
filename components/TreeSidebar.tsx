"use client";

import { useMemo, useState } from "react";
import TreeView from "./TreeView";
import { buildTree, filterTree } from "@/lib/json/tree";
import { validate } from "@/lib/json/validate";

interface Props {
  input: string;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  /** Mobile drawer close button; omitted on desktop. */
  onClose?: () => void;
}

export default function TreeSidebar({
  input,
  selectedPath,
  onSelect,
  onClose,
}: Props) {
  const [filter, setFilter] = useState("");
  const parsed = useMemo(() => validate(input), [input]);
  const tree = useMemo(
    () => (parsed.ok ? buildTree(parsed.value) : null),
    [parsed],
  );
  const filtered = useMemo(
    () => (tree ? filterTree(tree, filter) : null),
    [tree, filter],
  );
  const filtering = filter.trim() !== "";

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg-soft">
      <div className="flex items-center gap-2 border-b border-border px-2 py-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Structure
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto px-1 text-gray-400 hover:text-gray-200 lg:hidden"
            aria-label="Close tree"
          >
            ✕
          </button>
        )}
      </div>

      <div className="border-b border-border p-2">
        <div className="relative">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search keys & values…"
            className="w-full rounded border border-border bg-bg px-2 py-1 pr-6 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-accent"
          />
          {filtering && (
            <button
              onClick={() => setFilter("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-200"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {input.trim() === "" ? (
          <p className="p-3 text-xs text-gray-600">Paste JSON to see its tree.</p>
        ) : !tree ? (
          <p className="p-3 text-xs text-red-400">
            {!parsed.ok ? parsed.error.message : "Invalid JSON."}
          </p>
        ) : filtered ? (
          <TreeView
            root={filtered}
            onSelect={onSelect}
            selectedPath={selectedPath}
            forceOpen={filtering}
          />
        ) : (
          <p className="p-3 text-xs text-gray-600">No matches for “{filter}”.</p>
        )}
      </div>
    </div>
  );
}
