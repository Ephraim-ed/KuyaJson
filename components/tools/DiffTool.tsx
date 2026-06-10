"use client";

import { useMemo, useState } from "react";
import Split from "../Split";
import JsonEditor from "../JsonEditor";
import { Banner, Button } from "../ui";
import { type ToolProps } from "./types";
import { validate } from "@/lib/json/validate";
import { diff } from "@/lib/json/diff";
import { jsonrepair } from "jsonrepair";

export default function DiffTool({ input }: ToolProps) {
  const [left, setLeft] = useState(input);
  const [right, setRight] = useState("");
  const [ignoreOrder, setIgnoreOrder] = useState(true);

  const result = useMemo(() => {
    if (left.trim() === "" || right.trim() === "") return null;
    const lv = parseLenient(left);
    const rv = parseLenient(right);
    if (!lv.ok) return { error: `Left: ${lv.error}` };
    if (!rv.ok) return { error: `Right: ${rv.error}` };
    return diff(lv.value, rv.value, { ignoreArrayOrder: ignoreOrder });
  }, [left, right, ignoreOrder]);

  const editors = (
    <Split
      direction="horizontal"
      initial={0.5}
      storageKey="diff-lr"
      first={
        <div className="flex h-full min-h-0 flex-col">
          <div className="border-b border-border px-2 py-1 text-xs text-gray-500">Left</div>
          <div className="min-h-0 flex-1">
            <JsonEditor value={left} onChange={setLeft} placeholder="Paste JSON…" />
          </div>
        </div>
      }
      second={
        <div className="flex h-full min-h-0 flex-col border-l border-border">
          <div className="border-b border-border px-2 py-1 text-xs text-gray-500">Right</div>
          <div className="min-h-0 flex-1">
            <JsonEditor value={right} onChange={setRight} placeholder="Paste JSON…" />
          </div>
        </div>
      }
    />
  );

  const resultPane = (
    <div className="h-full overflow-auto border-t border-border bg-bg-soft p-2">
      {!result ? (
        <p className="text-sm text-gray-600">
          Paste JSON into both panes to see a structural diff.
        </p>
      ) : "error" in result ? (
        <Banner kind="error">{result.error}</Banner>
      ) : result.identical ? (
        <Banner kind="ok">The two documents are identical.</Banner>
      ) : (
        <div className="text-sm" dangerouslySetInnerHTML={{ __html: result.html }} />
      )}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-2 py-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Compare two documents
        </span>
        <label className="flex items-center gap-1.5 text-sm text-gray-400">
          <input
            type="checkbox"
            checked={ignoreOrder}
            onChange={(e) => setIgnoreOrder(e.target.checked)}
          />
          Ignore array order
        </label>
        <Button className="ml-auto" onClick={() => setLeft(input)}>
          Load document → left
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <Split
          direction="vertical"
          initial={0.62}
          storageKey="diff-result"
          first={editors}
          second={resultPane}
        />
      </div>
    </div>
  );
}

function parseLenient(
  text: string,
): { ok: true; value: unknown } | { ok: false; error: string } {
  const v = validate(text);
  if (v.ok) return { ok: true, value: v.value };
  try {
    return { ok: true, value: JSON.parse(jsonrepair(text)) };
  } catch {
    return { ok: false, error: v.error.message };
  }
}
