import * as jsondiffpatch from "jsondiffpatch";
import * as htmlFormatter from "jsondiffpatch/formatters/html";

export interface DiffOptions {
  /** Ignore object key order (always true for objects; affects arrays). */
  ignoreArrayOrder?: boolean;
}

export interface DiffResult {
  ok: boolean;
  /** True when the two documents are structurally identical. */
  identical: boolean;
  /** HTML rendering of the delta (empty when identical). */
  html: string;
  error?: string;
}

function makeInstance(opts: DiffOptions) {
  return jsondiffpatch.create({
    arrays: {
      detectMove: true,
      includeValueOnMove: false,
    },
    objectHash: opts.ignoreArrayOrder
      ? (obj: unknown, index?: number) => {
          if (obj && typeof obj === "object") {
            const o = obj as Record<string, unknown>;
            return String(o.id ?? o._id ?? o.key ?? o.name ?? JSON.stringify(obj));
          }
          return String(index);
        }
      : undefined,
  });
}

/** Structural (semantic) diff of two already-parsed JSON values, rendered as HTML. */
export function diff(left: unknown, right: unknown, opts: DiffOptions = {}): DiffResult {
  try {
    const instance = makeInstance(opts);
    const delta = instance.diff(left, right);
    if (!delta) {
      return { ok: true, identical: true, html: "" };
    }
    const html = htmlFormatter.format(delta, left) ?? "";
    return { ok: true, identical: false, html };
  } catch (e) {
    return {
      ok: false,
      identical: false,
      html: "",
      error: e instanceof Error ? e.message : "Could not compute diff.",
    };
  }
}
