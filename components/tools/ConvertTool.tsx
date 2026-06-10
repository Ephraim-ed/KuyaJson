"use client";

import { useState } from "react";
import ToolFrame from "./ToolFrame";
import OutputPanel from "../OutputPanel";
import { Button, Select } from "../ui";
import { type ToolProps } from "./types";
import { convert, type ConvertTarget } from "@/lib/json/convert";

const TARGETS: {
  value: ConvertTarget;
  label: string;
  ext: string;
  mime: string;
  lang: "json" | "text";
}[] = [
  { value: "yaml", label: "YAML", ext: "yaml", mime: "text/yaml", lang: "text" },
  { value: "xml", label: "XML", ext: "xml", mime: "application/xml", lang: "text" },
  { value: "csv", label: "CSV", ext: "csv", mime: "text/csv", lang: "text" },
  { value: "typescript", label: "TypeScript types", ext: "ts", mime: "text/plain", lang: "text" },
  { value: "python", label: "Python (dataclass)", ext: "py", mime: "text/plain", lang: "text" },
  { value: "pydantic", label: "Python (Pydantic)", ext: "py", mime: "text/plain", lang: "text" },
  { value: "go", label: "Go structs", ext: "go", mime: "text/plain", lang: "text" },
  { value: "schema", label: "JSON Schema", ext: "schema.json", mime: "application/json", lang: "json" },
];

export default function ConvertTool({ input, editor }: ToolProps) {
  const [target, setTarget] = useState<ConvertTarget>("yaml");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const meta = TARGETS.find((t) => t.value === target)!;

  async function run() {
    setBusy(true);
    setError(null);
    try {
      setOutput(await convert(input, target));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed.");
      setOutput("");
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
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );

  const results = (
    <OutputPanel
      value={output}
      language={meta.lang}
      filename={`output.${meta.ext}`}
      mime={meta.mime}
      emptyHint="Pick a target format and click Convert."
    />
  );

  return <ToolFrame controls={controls} editor={editor} results={results} splitKey="convert" />;
}
