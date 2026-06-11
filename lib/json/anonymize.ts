import { faker } from "@faker-js/faker";
import { JSONPath } from "jsonpath-plus";

export type PiiKind =
  | "email"
  | "phone"
  | "ssn"
  | "creditCard"
  | "ip"
  | "name"
  | "address"
  | "uuid"
  | "url"
  | "date";

export type MatchType = "key" | "keyGlob" | "keyRegex" | "jsonpath";

export type Strategy = "fake" | "redact" | "mask" | "hash";

export interface AnonRule {
  id: string;
  /** How to select target nodes. */
  match: MatchType;
  /** Pattern: key name / glob / regex / JSONPath expression. */
  pattern: string;
  /** How to replace matched values. */
  strategy: Strategy;
  /** For fake strategy: which kind of fake data to generate. */
  fakeKind?: PiiKind;
  enabled: boolean;
}

export interface DetectedPii {
  /** JSONPath to the value. */
  path: string;
  /** Dotted/bracket path for display. */
  displayPath: string;
  kind: PiiKind;
  /** A short preview of the original value. */
  preview: string;
}

// ---------------------------------------------------------------------------
// PII detection
// ---------------------------------------------------------------------------

const VALUE_PATTERNS: { kind: PiiKind; re: RegExp }[] = [
  { kind: "email", re: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  { kind: "uuid", re: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i },
  { kind: "ssn", re: /^\d{3}-\d{2}-\d{4}$/ },
  { kind: "creditCard", re: /^(?:\d[ -]?){13,19}$/ },
  { kind: "ip", re: /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/ },
  { kind: "phone", re: /^\+?[\d][\d\s().-]{6,}\d$/ },
  { kind: "url", re: /^https?:\/\/\S+$/i },
];

const KEY_HINTS: { kind: PiiKind; re: RegExp }[] = [
  { kind: "email", re: /e-?mail/i },
  { kind: "name", re: /(first|last|full|middle|given|family)?_?name|fullname|username/i },
  { kind: "phone", re: /phone|mobile|cell|tel/i },
  { kind: "ssn", re: /ssn|social.?security/i },
  { kind: "creditCard", re: /credit.?card|card.?number|ccnum|cc_?num/i },
  { kind: "ip", re: /ip.?addr|ipaddress|\bip\b/i },
  { kind: "address", re: /address|street|city|zip|postal/i },
  { kind: "date", re: /birth|dob|dateofbirth/i },
];

function looksLikeCreditCard(v: string): boolean {
  const digits = v.replace(/[ -]/g, "");
  if (!/^\d{13,19}$/.test(digits)) return false;
  // Luhn check to cut false positives.
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function classifyValue(key: string, value: unknown): PiiKind | null {
  if (typeof value === "string") {
    const v = value.trim();
    for (const { kind, re } of VALUE_PATTERNS) {
      if (kind === "creditCard") {
        if (looksLikeCreditCard(v)) return "creditCard";
        continue;
      }
      if (re.test(v)) return kind;
    }
  }
  // Key-name heuristics (only when the value is a primitive worth masking).
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    for (const { kind, re } of KEY_HINTS) {
      if (re.test(key)) return kind;
    }
  }
  return null;
}

function buildPath(parent: string, key: string | number): string {
  if (typeof key === "number") return `${parent}[${key}]`;
  if (/^[A-Za-z_$][\w$]*$/.test(key)) return `${parent}.${key}`;
  return `${parent}['${key.replace(/'/g, "\\'")}']`;
}

function displayOf(path: string): string {
  return path.replace(/^\$\.?/, "") || "(root)";
}

/** Walk the document and flag values that look like PII. */
export function detectPii(value: unknown): DetectedPii[] {
  const found: DetectedPii[] = [];

  function walk(node: unknown, path: string, key: string) {
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, buildPath(path, i), key));
      return;
    }
    if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        walk(v, buildPath(path, k), k);
      }
      return;
    }
    const kind = classifyValue(key, node);
    if (kind) {
      found.push({
        path,
        displayPath: displayOf(path),
        kind,
        preview: previewOf(node),
      });
    }
  }

  walk(value, "$", "");
  return found;
}

function previewOf(v: unknown): string {
  const s = String(v);
  return s.length > 40 ? s.slice(0, 37) + "…" : s;
}

// ---------------------------------------------------------------------------
// Fake-value generation with consistent mapping
// ---------------------------------------------------------------------------

/** Deterministic 32-bit hash (FNV-1a) of a string → used as a faker seed. */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function fakeFor(kind: PiiKind, seed: number): string {
  faker.seed(seed);
  switch (kind) {
    case "email":
      return faker.internet.email().toLowerCase();
    case "phone":
      return faker.phone.number();
    case "ssn":
      return `${faker.string.numeric(3)}-${faker.string.numeric(2)}-${faker.string.numeric(4)}`;
    case "creditCard":
      return faker.finance.creditCardNumber();
    case "ip":
      return faker.internet.ipv4();
    case "name":
      return faker.person.fullName();
    case "address":
      return faker.location.streetAddress();
    case "uuid":
      return faker.string.uuid();
    case "url":
      return faker.internet.url();
    case "date":
      return faker.date.past().toISOString().slice(0, 10);
    default:
      return faker.lorem.word();
  }
}

/**
 * A consistent fake-value mapper: the same original value always maps to the
 * same fake within one instance (preserving referential integrity). Seeded by a
 * hash of the original value so output is stable across occurrences.
 */
export class ConsistentFaker {
  private cache = new Map<string, string>();
  private typed = new Map<string, unknown>();

  get(kind: PiiKind, original: unknown): string {
    const orig = String(original);
    const cacheKey = `${kind}:${orig}`;
    const hit = this.cache.get(cacheKey);
    if (hit !== undefined) return hit;
    const fake = fakeFor(kind, hashString(cacheKey));
    this.cache.set(cacheKey, fake);
    return fake;
  }

  /** Fake a string of roughly similar shape (stable per original). */
  getString(original: string): string {
    const key = `str:${original}`;
    if (this.typed.has(key)) return this.typed.get(key) as string;
    faker.seed(hashString(key));
    let fake = faker.lorem.word();
    while (fake.length < original.length && fake.length < 48) {
      fake += " " + faker.lorem.word();
    }
    this.typed.set(key, fake);
    return fake;
  }

  /** Fake a number preserving integer/float and rough magnitude/sign. */
  getNumber(original: number): number {
    const key = `num:${original}`;
    if (this.typed.has(key)) return this.typed.get(key) as number;
    faker.seed(hashString(key));
    const abs = Math.abs(original);
    let fake: number;
    if (Number.isInteger(original)) {
      const digits = Math.max(1, Math.floor(Math.log10(abs || 1)) + 1);
      const min = digits > 1 ? Math.pow(10, digits - 1) : 0;
      const max = Math.pow(10, digits) - 1;
      fake = faker.number.int({ min, max });
    } else {
      const places = (String(original).split(".")[1] ?? "").length || 2;
      fake = faker.number.float({
        min: abs / 2 || 0,
        max: abs * 2 || 1,
        fractionDigits: Math.min(places, 6),
      });
    }
    if (original < 0) fake = -fake;
    this.typed.set(key, fake);
    return fake;
  }

  /** Fake a boolean (stable per original). */
  getBoolean(original: boolean): boolean {
    const key = `bool:${original}`;
    if (this.typed.has(key)) return this.typed.get(key) as boolean;
    faker.seed(hashString(key));
    const fake = faker.datatype.boolean();
    this.typed.set(key, fake);
    return fake;
  }
}

// ---------------------------------------------------------------------------
// Strategies
// ---------------------------------------------------------------------------

function maskValue(v: unknown): string {
  const s = String(v);
  if (s.length <= 2) return "*".repeat(s.length);
  const keep = s.length <= 6 ? 1 : 2;
  return s.slice(0, keep) + "*".repeat(s.length - keep * 2) + s.slice(-keep);
}

function hashValue(v: unknown): string {
  return `sha_${hashString(String(v)).toString(16).padStart(8, "0")}`;
}

function applyStrategy(
  value: unknown,
  rule: Pick<AnonRule, "strategy" | "fakeKind">,
  cf: ConsistentFaker,
  fallbackKind: PiiKind,
): unknown {
  switch (rule.strategy) {
    case "redact":
      return "***";
    case "mask":
      return maskValue(value);
    case "hash":
      return hashValue(value);
    case "fake":
    default:
      return cf.get(rule.fakeKind ?? fallbackKind, value);
  }
}

// ---------------------------------------------------------------------------
// Apply rules
// ---------------------------------------------------------------------------

function globToRegExp(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`, "i");
}

function keyMatches(rule: AnonRule, key: string): boolean {
  switch (rule.match) {
    case "key":
      return key.toLowerCase() === rule.pattern.toLowerCase();
    case "keyGlob":
      return globToRegExp(rule.pattern).test(key);
    case "keyRegex":
      try {
        return new RegExp(rule.pattern, "i").test(key);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

export interface AnonymizeResult {
  value: unknown;
  /** Number of values that were replaced. */
  count: number;
}

/**
 * Apply anonymization rules. Returns a new (deep-cloned) document. JSONPath
 * rules are resolved against the original document; key rules are applied during
 * a recursive walk. A shared ConsistentFaker keeps replacements stable.
 */
export function anonymize(
  value: unknown,
  rules: AnonRule[],
  cf: ConsistentFaker = new ConsistentFaker(),
): AnonymizeResult {
  const active = rules.filter((r) => r.enabled && r.pattern.trim() !== "");
  const clone = structuredClone(value);
  let count = 0;

  // Resolve JSONPath rules into a set of pointer paths up front.
  const jsonPathTargets = new Map<string, AnonRule>();
  for (const rule of active) {
    if (rule.match !== "jsonpath") continue;
    try {
      const paths: string[] = JSONPath({
        path: rule.pattern,
        json: clone as object,
        resultType: "path",
      });
      for (const p of paths) jsonPathTargets.set(p, rule);
    } catch {
      /* ignore bad expressions */
    }
  }

  function fallbackKind(key: string, val: unknown): PiiKind {
    return classifyValue(key, val) ?? "name";
  }

  function walk(node: unknown, pointer: string, key: string): unknown {
    // JSONPath match takes precedence for this exact node.
    const jpRule = jsonPathTargets.get(pointer);
    if (jpRule && !isContainer(node)) {
      count++;
      return applyStrategy(node, jpRule, cf, fallbackKind(key, node));
    }

    if (Array.isArray(node)) {
      return node.map((item, i) => walk(item, `${pointer}[${i}]`, key));
    }
    if (node && typeof node === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node)) {
        const childPointer = `${pointer}['${k}']`;
        const keyRule = active.find(
          (r) => r.match !== "jsonpath" && keyMatches(r, k),
        );
        if (keyRule && !isContainer(v) && !jsonPathTargets.has(childPointer)) {
          count++;
          out[k] = applyStrategy(v, keyRule, cf, fallbackKind(k, v));
        } else {
          out[k] = walk(v, childPointer, k);
        }
      }
      return out;
    }
    return node;
  }

  const result = walk(clone, "$", "");
  return { value: result, count };
}

function isContainer(v: unknown): boolean {
  return v != null && typeof v === "object";
}

/**
 * Anonymize every primitive value in the document, preserving each value's type
 * (string→string, number→number, boolean→boolean, null stays null). Values that
 * look like known PII keep a realistic fake of that kind; everything else gets a
 * type-appropriate fake. Replacements are stable per original value.
 */
export function anonymizeAllValues(
  value: unknown,
  cf: ConsistentFaker = new ConsistentFaker(),
): AnonymizeResult {
  let count = 0;

  function fakePrimitive(v: unknown): unknown {
    if (v === null) return null;
    if (typeof v === "boolean") {
      count++;
      return cf.getBoolean(v);
    }
    if (typeof v === "number") {
      count++;
      return cf.getNumber(v);
    }
    if (typeof v === "string") {
      count++;
      const kind = classifyValue("", v); // value-pattern PII only (no key)
      return kind ? cf.get(kind, v) : cf.getString(v);
    }
    return v;
  }

  function walk(node: unknown): unknown {
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(node)) out[k] = walk(val);
      return out;
    }
    return fakePrimitive(node);
  }

  return { value: walk(structuredClone(value)), count };
}

/** Build a one-click rule set from detected PII (fake everything by kind). */
export function rulesFromDetected(detected: DetectedPii[]): AnonRule[] {
  const byKind = new Map<PiiKind, AnonRule>();
  detected.forEach((d) => {
    if (byKind.has(d.kind)) return;
    byKind.set(d.kind, {
      id: `auto-${d.kind}`,
      match: "jsonpath",
      // Fake every detected path of this kind via explicit JSONPath union later;
      // here we use one rule per detected path for precision.
      pattern: d.path,
      strategy: "fake",
      fakeKind: d.kind,
      enabled: true,
    });
  });
  // One rule per detected path keeps targeting exact; expand the map back out.
  return detected.map((d, i) => ({
    id: `auto-${i}`,
    match: "jsonpath",
    pattern: d.path,
    strategy: "fake",
    fakeKind: d.kind,
    enabled: true,
  }));
}

export const PII_LABELS: Record<PiiKind, string> = {
  email: "Email",
  phone: "Phone",
  ssn: "SSN",
  creditCard: "Credit card",
  ip: "IP address",
  name: "Name",
  address: "Address",
  uuid: "UUID",
  url: "URL",
  date: "Date",
};
