"use client";

import { useState } from "react";
import ToolFrame from "./ToolFrame";
import { Button, Select, useToast } from "../ui";
import { type ToolProps } from "./types";
import { runFormat, runMinify, runSort } from "@/lib/workers/client";
import { type IndentStyle } from "@/lib/json/format";
import { validate } from "@/lib/json/validate";
import { runRepair } from "@/lib/workers/client";
import type { RepairResult } from "@/lib/json/repair";
import { unescapeJson } from "@/lib/json/unescape";

export default function FormatTool({ input, setInput, editor }: ToolProps) {
  const [indent, setIndent] = useState<IndentStyle>("2");
  const toast = useToast();

  async function apply(run: () => Promise<string>, okText?: string) {
    try {
      setInput(await run());
      if (okText) toast(okText, { kind: "ok" });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Invalid JSON.", { kind: "error" });
    }
  }

  function doValidate() {
    if (input.trim() === "") {
      toast("Nothing to validate — the document is empty.", { kind: "info" });
      return;
    }
    const r = validate(input);
    if (r.ok) toast("Valid JSON ✓", { kind: "ok" });
    else toast(r.error.message, { kind: "error" });
  }

  async function doRepair() {
    const r = (await runRepair(input, 2)) as RepairResult;
    if (r.error) {
      toast(r.error, { kind: "error" });
      return;
    }
    if (!r.changed) {
      toast("Already valid JSON — nothing to repair.", { kind: "info" });
      return;
    }
    setInput(r.text);
    toast(`Repaired ✓ — ${r.fixes.join("; ")}`, { kind: "ok", duration: 4500 });
  }

  function unescape() {
    const { text, changed, expanded } = unescapeJson(input);
    if (!changed) {
      toast("No escaped JSON found to unwrap.", { kind: "info" });
      return;
    }
    apply(
      () => runFormat(text, indent),
      expanded > 0
        ? `Expanded ${expanded} nested JSON value${expanded === 1 ? "" : "s"}.`
        : "Unwrapped escaped JSON.",
    );
  }

  const controls = (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-2 py-1.5">
      <Select
        title="Indentation"
        value={indent}
        onChange={(v) => setIndent(v as IndentStyle)}
        options={[
          { value: "2", label: "2 spaces" },
          { value: "4", label: "4 spaces" },
          { value: "tab", label: "Tabs" },
        ]}
      />
      <Button variant="primary" onClick={() => apply(() => runFormat(input, indent))}>
        Format
      </Button>
      <Button onClick={() => apply(() => runMinify(input))}>Minify</Button>
      <Button onClick={() => apply(() => runSort(input, "asc", indent))}>
        Sort keys
      </Button>
      <span className="mx-1 h-5 w-px bg-border" />
      <Button onClick={doValidate} title="Check that the document is valid JSON">
        Validate
      </Button>
      <Button onClick={doRepair} title="Fix quotes, commas, comments, Python literals…">
        Repair
      </Button>
      <Button onClick={unescape} title="Unwrap stringified / escaped JSON">
        Unescape
      </Button>
    </div>
  );

  return <ToolFrame controls={controls} editor={editor} />;
}
