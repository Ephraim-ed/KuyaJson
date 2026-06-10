import { jsonrepair } from "jsonrepair";

export interface UnescapeResult {
  text: string;
  changed: boolean;
  /** How many nested stringified-JSON values were expanded. */
  expanded: number;
}

const ESCAPE_MAP: Record<string, string> = {
  '"': '"',
  "\\": "\\",
  "/": "/",
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
};

/** Manually decode backslash escapes (for escaped JSON without outer quotes). */
function manualUnescape(s: string): string {
  return s
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    )
    .replace(/\\(["\\/bfnrt])/g, (_, c) => ESCAPE_MAP[c] ?? c);
}

function isValidJson(s: string): boolean {
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
}

/**
 * Recursively expand string values that are themselves stringified JSON
 * objects/arrays, e.g. `{ "payload": "{\"a\":1}" }` → `{ "payload": { "a": 1 } }`.
 *
 * Only strings that parse to an object or array are expanded — plain strings,
 * numeric-looking strings ("123") and booleans-as-strings are left untouched so
 * we never change a value's meaning unexpectedly. `count` reports how many
 * nested values were expanded.
 */
export function deepUnescape(
  value: unknown,
  counter: { count: number } = { count: 0 },
): { value: unknown; count: number } {
  function walk(node: unknown): unknown {
    if (typeof node === "string") {
      const trimmed = node.trim();
      if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
      ) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed === "object") {
            counter.count++;
            return walk(parsed);
          }
        } catch {
          /* not nested JSON — keep the original string */
        }
      }
      return node;
    }
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node)) out[k] = walk(v);
      return out;
    }
    return node;
  }

  return { value: walk(value), count: counter.count };
}

/**
 * Unwrap escaped / stringified JSON into raw JSON.
 *
 * Handles:
 *  - A JSON string literal that contains JSON: `"{\"a\":1}"` (incl. double-encoded).
 *  - Inline-escaped JSON with no surrounding quotes: `{\"a\": 1}`.
 *
 * Returns the most-unwrapped text it can produce, plus whether anything changed.
 */
export function unescapeJson(text: string): UnescapeResult {
  let cur = text.trim();
  const original = cur;

  // Repeatedly peel off string-literal wrappers (double/triple-encoded JSON).
  for (let i = 0; i < 8; i++) {
    try {
      const parsed = JSON.parse(cur);
      if (typeof parsed === "string") {
        cur = parsed.trim();
        continue;
      }
      break; // Parsed to object/array/etc. — already raw JSON.
    } catch {
      // Inline-escaped case: contains `\"` but isn't directly parseable.
      if (/\\["\\/bfnrtu]/.test(cur)) {
        const decoded = manualUnescape(cur);
        if (isValidJson(decoded)) {
          cur = decoded.trim();
        } else {
          try {
            const repaired = jsonrepair(decoded);
            if (isValidJson(repaired)) cur = repaired;
          } catch {
            /* leave cur as-is */
          }
        }
      }
      break;
    }
  }

  // Expand any nested stringified-JSON values inside the document.
  let expanded = 0;
  if (isValidJson(cur)) {
    const result = deepUnescape(JSON.parse(cur));
    expanded = result.count;
    if (expanded > 0) {
      cur = JSON.stringify(result.value, null, 2);
    }
  }

  return { text: cur, changed: cur !== original, expanded };
}

/** True if the input looks like escaped/stringified JSON worth unwrapping. */
export function looksEscaped(text: string): boolean {
  const t = text.trim();
  if (t.startsWith('"') && t.endsWith('"') && t.includes('\\"')) return true;
  if (/\\["\\]/.test(t) && /[{[]/.test(t)) return true;
  return false;
}
