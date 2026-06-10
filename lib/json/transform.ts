export type SortOrder = "asc" | "desc";

/** Recursively sort object keys. Arrays keep their order; their items are sorted. */
export function sortKeys(value: unknown, order: SortOrder = "asc"): unknown {
  if (Array.isArray(value)) {
    return value.map((v) => sortKeys(v, order));
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    entries.sort(([a], [b]) =>
      order === "asc" ? a.localeCompare(b) : b.localeCompare(a),
    );
    const out: Record<string, unknown> = {};
    for (const [k, v] of entries) out[k] = sortKeys(v, order);
    return out;
  }
  return value;
}

/** Flatten a nested object/array into dot/bracket-notation key → primitive pairs. */
export function flatten(value: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  function walk(node: unknown, prefix: string) {
    if (Array.isArray(node)) {
      if (node.length === 0) {
        out[prefix] = [];
        return;
      }
      node.forEach((item, i) => walk(item, prefix ? `${prefix}[${i}]` : `[${i}]`));
      return;
    }
    if (node && typeof node === "object") {
      const entries = Object.entries(node);
      if (entries.length === 0) {
        out[prefix] = {};
        return;
      }
      for (const [k, v] of entries) {
        walk(v, prefix ? `${prefix}.${k}` : k);
      }
      return;
    }
    out[prefix] = node;
  }

  walk(value, "");
  return out;
}

/** Inverse of flatten: rebuild a nested structure from dot/bracket keys. */
export function unflatten(flat: Record<string, unknown>): unknown {
  const root: Record<string, unknown> = {};

  for (const [compound, val] of Object.entries(flat)) {
    const tokens = compound.match(/[^.[\]]+/g) ?? [];
    let cursor: Record<string, unknown> | unknown[] = root;

    tokens.forEach((token, i) => {
      const isLast = i === tokens.length - 1;
      const nextToken = tokens[i + 1];
      const isIndex = /^\d+$/.test(token);
      const key = isIndex ? Number(token) : token;

      if (isLast) {
        (cursor as Record<string | number, unknown>)[key] = val;
        return;
      }

      const nextIsIndex = /^\d+$/.test(nextToken);
      const existing = (cursor as Record<string | number, unknown>)[key];
      if (existing === undefined) {
        (cursor as Record<string | number, unknown>)[key] = nextIsIndex ? [] : {};
      }
      cursor = (cursor as Record<string | number, unknown>)[key] as
        | Record<string, unknown>
        | unknown[];
    });
  }

  return root;
}

export type MergeStrategy = "deep" | "lastWins" | "firstWins";

/** Merge multiple JSON documents per the chosen conflict strategy. */
export function merge(docs: unknown[], strategy: MergeStrategy = "deep"): unknown {
  if (docs.length === 0) return null;
  return docs.reduce((acc, doc) => mergeTwo(acc, doc, strategy));
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function mergeTwo(a: unknown, b: unknown, strategy: MergeStrategy): unknown {
  if (isPlainObject(a) && isPlainObject(b)) {
    const out: Record<string, unknown> = { ...a };
    for (const [k, v] of Object.entries(b)) {
      if (k in out) {
        if (strategy === "firstWins") continue;
        out[k] =
          strategy === "deep" ? mergeTwo(out[k], v, strategy) : v;
      } else {
        out[k] = v;
      }
    }
    return out;
  }
  // Non-objects: lastWins/deep take b, firstWins keeps a.
  return strategy === "firstWins" ? a : b;
}
