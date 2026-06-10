import { jsonrepair } from "jsonrepair";

export interface RepairResult {
  /** The repaired JSON text (pretty-printed). */
  text: string;
  /** Whether anything was changed. */
  changed: boolean;
  /** Human-readable summary of the kinds of fixes that were applied. */
  fixes: string[];
  /** Set when repair failed entirely. */
  error?: string;
}

/**
 * Heuristically describe what kinds of problems were present in the original
 * text, so we can show the user a summary of fixes. These are best-effort:
 * jsonrepair doesn't report a structured changelog.
 */
function detectFixes(original: string): string[] {
  const fixes: string[] = [];
  const src = original;

  if (/'[^']*'\s*:/.test(src) || /:\s*'[^']*'/.test(src)) {
    fixes.push("Converted single quotes to double quotes");
  }
  if (/[{,]\s*[A-Za-z_$][\w$]*\s*:/.test(src)) {
    fixes.push("Added quotes around unquoted keys");
  }
  if (/,\s*[}\]]/.test(src)) {
    fixes.push("Removed trailing commas");
  }
  if (/\/\/[^\n]*|\/\*[\s\S]*?\*\//.test(src)) {
    fixes.push("Stripped comments");
  }
  if (/\b(True|False|None)\b/.test(src)) {
    fixes.push("Converted Python literals (True/False/None) to JSON");
  }
  if (/\bNaN\b|\bInfinity\b/.test(src)) {
    fixes.push("Replaced NaN/Infinity with null");
  }
  if (/}\s*{|]\s*\[|"\s*\n\s*"/.test(src)) {
    fixes.push("Joined or fixed concatenated values");
  }
  return fixes;
}

/** Repair broken/relaxed JSON into strict JSON. */
export function repair(text: string, indent: number | string = 2): RepairResult {
  try {
    const repaired = jsonrepair(text);
    const pretty = JSON.stringify(JSON.parse(repaired), null, indent);
    const changed = pretty.trim() !== text.trim();
    let fixes = detectFixes(text);
    if (changed && fixes.length === 0) {
      fixes = ["Normalized formatting and structure"];
    }
    return { text: pretty, changed, fixes: changed ? fixes : [] };
  } catch (e) {
    return {
      text,
      changed: false,
      fixes: [],
      error:
        e instanceof Error
          ? e.message
          : "Could not repair the input — the structure is too damaged.",
    };
  }
}
