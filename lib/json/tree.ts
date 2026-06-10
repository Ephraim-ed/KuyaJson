export type ValueType =
  | "object"
  | "array"
  | "string"
  | "number"
  | "boolean"
  | "null";

export interface TreeNode {
  /** Display key (object key, array index, or "root"). */
  key: string;
  type: ValueType;
  /** JSONPath to this node. */
  path: string;
  /** Primitive value, when type is a leaf. */
  value?: string | number | boolean | null;
  /** Child count for containers. */
  size?: number;
  children?: TreeNode[];
}

function typeOf(v: unknown): ValueType {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  const t = typeof v;
  if (t === "object") return "object";
  return t as ValueType;
}

function childPath(parent: string, key: string | number): string {
  if (typeof key === "number") return `${parent}[${key}]`;
  if (/^[A-Za-z_$][\w$]*$/.test(key)) return `${parent}.${key}`;
  return `${parent}['${key.replace(/'/g, "\\'")}']`;
}

/** Build a renderable tree model with types, sizes, and JSONPath per node. */
export function buildTree(value: unknown, key = "root", path = "$"): TreeNode {
  const type = typeOf(value);

  if (type === "array") {
    const arr = value as unknown[];
    return {
      key,
      type,
      path,
      size: arr.length,
      children: arr.map((item, i) => buildTree(item, String(i), childPath(path, i))),
    };
  }

  if (type === "object") {
    const obj = value as Record<string, unknown>;
    const entries = Object.entries(obj);
    return {
      key,
      type,
      path,
      size: entries.length,
      children: entries.map(([k, v]) => buildTree(v, k, childPath(path, k))),
    };
  }

  return { key, type, path, value: value as string | number | boolean | null };
}

/**
 * Prune a tree to branches that match a search term (case-insensitive) on either
 * a node's key or a leaf's value. Ancestors of matches are kept for context; if a
 * container's own key matches, its whole subtree is kept. Returns null when
 * nothing matches.
 */
export function filterTree(node: TreeNode, term: string): TreeNode | null {
  const q = term.trim().toLowerCase();
  if (q === "") return node;

  function walk(n: TreeNode): TreeNode | null {
    const keyMatch = n.key.toLowerCase().includes(q);
    if (n.children) {
      if (keyMatch) return n; // keep entire subtree for context
      const kept = n.children
        .map(walk)
        .filter((c): c is TreeNode => c !== null);
      if (kept.length > 0) return { ...n, children: kept };
      return null;
    }
    const valueMatch = String(n.value).toLowerCase().includes(q);
    return keyMatch || valueMatch ? n : null;
  }

  return walk(node);
}
