"use client";

import { useState } from "react";
import ToolFrame from "./ToolFrame";
import OutputPanel from "../OutputPanel";
import JsonEditor from "../JsonEditor";
import { Banner, Button } from "../ui";
import { useConsole } from "../console";
import { DocumentActions } from "../DocumentActions";
import { type ToolProps } from "./types";
import { generateSchema, validateAgainstSchema } from "@/lib/json/schema";

type Mode = "generate" | "validate";
type Report = { valid: boolean; errors: string[]; fatal?: string } | null;

export default function SchemaTool({ input, editor }: ToolProps) {
  const [mode, setMode] = useState<Mode>("generate");
  const [schemaText, setSchemaText] = useState("");
  const [generated, setGenerated] = useState("");
  const [report, setReport] = useState<Report>(null);
  const [busy, setBusy] = useState(false);
  const { push, clearSource } = useConsole();

  async function generate() {
    setBusy(true);
    setReport(null);
    try {
      setGenerated(await generateSchema(input));
    } catch (e) {
      setReport({
        valid: false,
        errors: [],
        fatal: e instanceof Error ? e.message : "Could not generate schema.",
      });
    } finally {
      setBusy(false);
    }
  }

  function runValidate() {
    clearSource("schema"); // drop previous (possibly now-fixed) results
    const r = validateAgainstSchema(input, schemaText);
    setReport({ valid: r.valid, errors: r.errors, fatal: r.fatal });
    if (r.fatal) {
      push("error", r.fatal, "schema");
    } else if (r.valid) {
      push("ok", "Document matches the schema", "schema");
    } else {
      push("error", `Schema validation failed (${r.errors.length} issue${r.errors.length === 1 ? "" : "s"})`, "schema");
      r.errors.forEach((e) => push("error", e, "schema"));
    }
  }

  const controls = (
    <div className="flex flex-col gap-2 border-b border-border px-2 py-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Button active={mode === "generate"} onClick={() => setMode("generate")}>
          Generate schema
        </Button>
        <Button active={mode === "validate"} onClick={() => setMode("validate")}>
          Validate against schema
        </Button>
        {mode === "generate" ? (
          <Button variant="primary" className="ml-auto" onClick={generate} disabled={busy}>
            {busy ? "Generating…" : "Generate"}
          </Button>
        ) : (
          <Button variant="primary" className="ml-auto" onClick={runValidate}>
            Validate
          </Button>
        )}
        <DocumentActions />
      </div>
      {report &&
        (report.fatal ? (
          <Banner kind="error">{report.fatal}</Banner>
        ) : report.valid ? (
          <Banner kind="ok">Document is valid against the schema ✓</Banner>
        ) : (
          <Banner kind="error">
            <div>
              <div className="font-medium">Document does not match the schema:</div>
              <ul className="mt-1 list-disc pl-5">
                {report.errors.map((e, i) => (
                  <li key={i} className="font-mono text-xs">
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          </Banner>
        ))}
    </div>
  );

  const results =
    mode === "generate" ? (
      <OutputPanel
        value={generated}
        filename="schema.json"
        emptyHint="Click Generate to infer a JSON Schema (draft 2020-12) from the document."
      />
    ) : (
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-b border-border px-2 py-1 text-xs text-gray-500">
          Paste the JSON Schema to validate the document against:
        </div>
        <div className="min-h-0 flex-1">
          <JsonEditor
            value={schemaText}
            onChange={setSchemaText}
            placeholder='{ "type": "object", ... }'
          />
        </div>
      </div>
    );

  return <ToolFrame controls={controls} editor={editor} results={results} splitKey="schema" />;
}
