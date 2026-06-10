"use client";

import { type ReactNode } from "react";
import { TOOLS } from "./tools/registry";
import type { ToolId } from "./tools/types";

/** Renders the active tool, passing it the shared document editor slot. */
export default function ToolHost({
  id,
  input,
  setInput,
  editor,
}: {
  id: ToolId;
  input: string;
  setInput: (v: string) => void;
  editor: ReactNode;
}) {
  const tool = TOOLS.find((t) => t.id === id)!;
  const Component = tool.component;
  return <Component input={input} setInput={setInput} editor={editor} />;
}
