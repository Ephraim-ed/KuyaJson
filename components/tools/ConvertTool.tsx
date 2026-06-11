"use client";

import { useState } from "react";
import ToolFrame from "./ToolFrame";
import { Button, Select } from "../ui";
import { DocumentActions } from "../DocumentActions";
import { useConsole } from "../console";
import { type ToolProps } from "./types";
import { convert, type ConvertTarget } from "@/lib/json/convert";

const TARGETS: {
  value: ConvertTarget;
  label: string;
  ext: string;
  mime: string;
}[] = [
  { value: "yaml", label: "YAML", ext: "yaml", mime: "text/yaml" },
  { value: "xml", label: "XML", ext: "xml", mime: "application/xml" },
  { value: "csv", label: "CSV", ext: "csv", mime: "text/csv" },
  { value: "typescript", label: "TypeScript types", ext: "ts", mime: "text/plain" },
  { value: "python", label: "Python (dataclass)", ext: "py", mime: "text/plain" },
  { value: "pydantic", label: "Python (Pydantic)", ext: "py", mime: "text/plain" },
  { value: "go", label: "Go structs", ext: "go", mime: "text/plain" },
  { value: "schema", label: "JSON Schema", ext: "schema.json", mime: "application/json" },
];

export default function ConvertTool({ input, editor }: ToolProps) {
  const [target, setTarget] = useState<ConvertTarget>("yaml");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { setOutput } = useConsole();

  const meta = TARGETS.find((t) => t.value === target)!;

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const text = await convert(input, target);
      setOutput({
        kind: "text",
        title: `Converted to ${meta.label}`,
        text,
        filename: `output.${meta.ext}`,
        mime: meta.mime,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed.");
    } finally {
      setBusy(false);
    }
  }

  const controls = (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-2 py-1.5">
      <Select
        title="Target format"
        value={target}
        onChange={(v) => setTarget(v as ConvertTarget)}
        options={TARGETS.map((t) => ({ value: t.value, label: t.label }))}
      />
      <Button variant="primary" onClick={run} disabled={busy}>
        {busy ? "Converting…" : "Convert"}
      </Button>
      <span className="text-xs text-gray-500">
        Output appears in the Output panel below.
      </span>
      {error && <span className="text-xs text-red-400">{error}</span>}
      <DocumentActions className="ml-auto" />
    </div>
  );

  return <ToolFrame controls={controls} editor={editor} />;
}
