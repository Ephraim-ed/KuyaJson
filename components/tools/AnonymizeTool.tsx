"use client";

import { useMemo, useState } from "react";
import Split from "../Split";
import { VenetianMask, Info, ShieldCheck } from "lucide-react";
import { Banner, Button, Select } from "../ui";
import Tooltip from "../Tooltip";
import { DocumentActions } from "../DocumentActions";
import { type ToolProps } from "./types";
import { runAnonymize } from "@/lib/workers/client";
import { validate } from "@/lib/json/validate";
import {
  detectPii,
  rulesFromDetected,
  anonymizeAllValues,
  PII_LABELS,
  type AnonRule,
  type DetectedPii,
  type MatchType,
  type Strategy,
} from "@/lib/json/anonymize";

let ruleSeq = 0;
function newRule(): AnonRule {
  return { id: `r${ruleSeq++}`, match: "key", pattern: "", strategy: "fake", enabled: true };
}

export default function AnonymizeTool({ input, setInput, editor }: ToolProps) {
  const [rules, setRules] = useState<AnonRule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);

  const detected: DetectedPii[] = useMemo(() => {
    const v = validate(input);
    return v.ok ? detectPii(v.value) : [];
  }, [input]);

  async function run(activeRules: AnonRule[]) {
    const v = validate(input);
    if (!v.ok) {
      setError(v.error.message);
      return;
    }
    setError(null);
    const r = await runAnonymize(input, activeRules);
    setInput(r.text); // apply in place
    setCount(r.count);
  }

  function anonymizeAllPii() {
    const autoRules = rulesFromDetected(detected);
    setRules(autoRules);
    run(autoRules);
  }

  function anonymizeEverything() {
    const v = validate(input);
    if (!v.ok) {
      setError(v.error.message);
      return;
    }
    setError(null);
    const r = anonymizeAllValues(v.value);
    setInput(JSON.stringify(r.value, null, 2));
    setCount(r.count);
  }

  const updateRule = (id: string, patch: Partial<AnonRule>) =>
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRule = (id: string) => setRules((rs) => rs.filter((r) => r.id !== id));

  const rulesPanel = (
    <div className="flex h-full min-h-0 flex-col overflow-auto border-l border-border bg-bg-soft">
      <div className="flex items-center gap-2 border-b border-border px-2 py-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Rules
        </span>
        <Button
          variant="primary"
          className="ml-auto"
          onClick={() => run(rules)}
          disabled={rules.length === 0}
          title="Apply the rules below to the document"
        >
          Anonymize
        </Button>
        <Button onClick={() => setRules((rs) => [...rs, newRule()])}>+ Rule</Button>
      </div>

      <div className="border-b border-border p-2">
        <div className="mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs font-medium text-gray-400">
            Detected PII ({detected.length})
            <Tooltip text="PII = Personally Identifiable Information — data that can identify someone (emails, phone numbers, SSNs, credit cards, IPs, names, addresses). Kuya auto-detects these so you can mask them.">
              <Info size={12} className="cursor-help text-gray-500 hover:text-gray-300" />
            </Tooltip>
          </span>
          <Button variant="primary" disabled={detected.length === 0} onClick={anonymizeAllPii}>
            <ShieldCheck size={15} />
            Anonymize PII
          </Button>
        </div>
        <div className="max-h-40 space-y-1 overflow-auto">
          {detected.length === 0 ? (
            <p className="text-xs text-gray-600">No PII detected.</p>
          ) : (
            detected.map((d, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded bg-bg px-2 py-1 text-xs"
              >
                <span className="rounded bg-bg-softer px-1.5 py-0.5 text-[10px] uppercase text-accent">
                  {PII_LABELS[d.kind]}
                </span>
                <span className="truncate text-gray-400" title={d.displayPath}>
                  {d.displayPath}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 space-y-2 p-2">
        {rules.length === 0 && (
          <p className="text-xs text-gray-600">
            Add a rule, or use “Anonymize all” to mask detected PII.
          </p>
        )}
        {rules.map((r) => (
          <div key={r.id} className="space-y-1.5 rounded border border-border p-2">
            <div className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={r.enabled}
                onChange={(e) => updateRule(r.id, { enabled: e.target.checked })}
              />
              <Select
                className="flex-1"
                value={r.match}
                onChange={(v) => updateRule(r.id, { match: v as MatchType })}
                options={[
                  { value: "key", label: "Key (exact)" },
                  { value: "keyGlob", label: "Key (glob)" },
                  { value: "keyRegex", label: "Key (regex)" },
                  { value: "jsonpath", label: "JSONPath" },
                ]}
              />
              <button
                onClick={() => removeRule(r.id)}
                className="px-1 text-gray-500 hover:text-red-300"
                title="Remove rule"
              >
                ✕
              </button>
            </div>
            <input
              value={r.pattern}
              onChange={(e) => updateRule(r.id, { pattern: e.target.value })}
              placeholder={r.match === "jsonpath" ? "$..email" : "email / user* / .*Name"}
              className="w-full rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <Select
              className="w-full"
              value={r.strategy}
              onChange={(v) => updateRule(r.id, { strategy: v as Strategy })}
              options={[
                { value: "fake", label: "Fake (realistic)" },
                { value: "mask", label: "Mask (a***z)" },
                { value: "redact", label: "Redact (***)" },
                { value: "hash", label: "Hash (stable)" },
              ]}
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-2 py-1.5">
        <Button
          variant="primary"
          onClick={anonymizeEverything}
          title="Replace every value with a fake of the same type (strings, numbers, booleans), keeping structure & types"
        >
          <VenetianMask size={15} />
          Anonymize all values
        </Button>
        {count != null && (
          <span className="text-xs text-gray-500">{count} values replaced (applied to document)</span>
        )}
        {error && <span className="text-xs text-red-400">{error}</span>}
        <DocumentActions className="ml-auto" />
      </div>
      <div className="min-h-0 flex-1">
        <Split
          direction="horizontal"
          initial={0.62}
          storageKey="anon-rules"
          first={editor}
          second={rulesPanel}
        />
      </div>
    </div>
  );
}
