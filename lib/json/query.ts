import { JSONPath } from "jsonpath-plus";

export interface QueryResult {
  ok: boolean;
  /** Matched values (for JSONPath) or matched nodes (for text search). */
  matches: { path: string; value: unknown }[];
  error?: string;
}

/** Evaluate a JSONPath expression against the document. */
export function queryJsonPath(value: unknown, expr: string): QueryResult {
  if (expr.trim() === "") {
    return { ok: true, matches: [] };
  }
  try {
    const results = JSONPath({
      path: expr,
      json: value as object,
      resultType: "all",
    }) as { path: string; value: unknown }[];
    return {
      ok: true,
      matches: results.map((r) => ({ path: r.path, value: r.value })),
    };
  } catch (e) {
    return {
      ok: false,
      matches: [],
      error: e instanceof Error ? e.message : "Invalid JSONPath expression.",
    };
  }
}

function buildPath(parent: string, key: string | number): string {
  if (typeof key === "number") return `${parent}[${key}]`;
  if (/^[A-Za-z_$][\w$]*$/.test(key)) return `${parent}.${key}`;
  return `${parent}['${key.replace(/'/g, "\\'")}']`;
}

/** Plain-text search across keys and primitive values (case-insensitive). */
export function searchText(value: unknown, term: string): QueryResult {
  const q = term.trim().toLowerCase();
  if (q === "") return { ok: true, matches: [] };
  const matches: { path: string; value: unknown }[] = [];

  function walk(node: unknown, path: string, key: string) {
    if (key.toLowerCase().includes(q)) {
      matches.push({ path, value: node });
    } else if (
      node === null ||
      typeof node === "string" ||
      typeof node === "number" ||
      typeof node === "boolean"
    ) {
      if (String(node).toLowerCase().includes(q)) {
        matches.push({ path, value: node });
      }
    }

    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, buildPath(path, i), String(i)));
    } else if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        walk(v, buildPath(path, k), k);
      }
    }
  }

  walk(value, "$", "");
  return { ok: true, matches };
}
