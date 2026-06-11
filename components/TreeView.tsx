"use client";

import { useState } from "react";
import { type TreeNode, type ValueType } from "@/lib/json/tree";
import { copyText } from "@/lib/clipboard";
import { useToast } from "./ui";

const TYPE_COLOR: Record<ValueType, string> = {
  object: "text-purple-300",
  array: "text-purple-300",
  string: "text-green-300",
  number: "text-amber-300",
  boolean: "text-sky-300",
  null: "text-gray-500",
};

function renderValue(node: TreeNode): string {
  if (node.type === "string") return `"${node.value}"`;
  return String(node.value);
}

interface TreeProps {
  onSelect?: (path: string) => void;
  selectedPath?: string | null;
  /** Force-expand all containers (used while filtering). */
  forceOpen?: boolean;
}

function Node({
  node,
  depth,
  onSelect,
  selectedPath,
  forceOpen,
}: TreeProps & { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const toast = useToast();
  const isContainer = node.type === "object" || node.type === "array";
  const selected = selectedPath === node.path;
  const expanded = forceOpen || open; // filtering force-expands

  async function copyPath(e: React.MouseEvent) {
    e.stopPropagation();
    const ok = await copyText(node.path);
    toast(ok ? "Copied path" : "Copy failed");
  }

  return (
    <div className="leading-6">
      <div
        onClick={() => onSelect?.(node.path)}
        className={`group flex cursor-pointer items-center gap-1.5 rounded px-1 ${
          selected ? "bg-accent/20 ring-1 ring-accent/40" : "hover:bg-bg-soft"
        }`}
        title={`Focus ${node.path}`}
      >
        {isContainer ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => !o);
            }}
            className="w-4 shrink-0 text-gray-500 hover:text-gray-200"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <span className="shrink-0 font-mono text-[1em] text-sky-200">
          {node.key}
          <span className="text-gray-500">:</span>
        </span>

        {isContainer ? (
          <span className="text-[0.82em] text-gray-500">
            {node.type === "array" ? `[${node.size}]` : `{${node.size}}`}
          </span>
        ) : (
          <span
            className={`truncate font-mono text-[1em] ${TYPE_COLOR[node.type]}`}
          >
            {renderValue(node)}
          </span>
        )}

        <button
          onClick={copyPath}
          title="Copy JSONPath"
          className="ml-auto hidden shrink-0 px-1 text-[0.82em] text-gray-500 hover:text-gray-200 group-hover:block"
        >
          ⧉
        </button>
      </div>

      {isContainer && expanded && node.children && (
        <div className="ml-[9px] border-l border-border pl-2">
          {node.children.map((child, i) => (
            <Node
              key={i}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedPath={selectedPath}
              forceOpen={forceOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TreeView({
  root,
  onSelect,
  selectedPath,
  forceOpen,
  fontSize = 13,
}: TreeProps & { root: TreeNode; fontSize?: number }) {
  return (
    <div
      className="h-full overflow-auto p-2 font-mono"
      style={{ fontSize }}
    >
      <Node
        node={root}
        depth={0}
        onSelect={onSelect}
        selectedPath={selectedPath}
        forceOpen={forceOpen}
      />
    </div>
  );
}
