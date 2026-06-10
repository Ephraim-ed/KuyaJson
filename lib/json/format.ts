export type IndentStyle = "2" | "4" | "tab";

function indentValue(style: IndentStyle): string | number {
  if (style === "tab") return "\t";
  return Number(style);
}

/** Pretty-print a JSON string with the given indentation. Throws on invalid JSON. */
export function format(text: string, indent: IndentStyle = "2"): string {
  const parsed = JSON.parse(text);
  return JSON.stringify(parsed, null, indentValue(indent));
}

/** Compress JSON to a single line. Throws on invalid JSON. */
export function minify(text: string): string {
  return JSON.stringify(JSON.parse(text));
}
