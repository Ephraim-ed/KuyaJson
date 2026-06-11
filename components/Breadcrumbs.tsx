"use client";

import { Fragment } from "react";

interface Segment {
  label: string;
  path: string;
}

/** Split a JSONPath like `$.a[1]['x y']` into clickable cumulative segments. */
function parsePath(path: string): Segment[] {
  const segs: Segment[] = [{ label: "root", path: "$" }];
  let cursor = "$";
  const re = /\.([\w$]+)|\[(\d+)\]|\['((?:[^'\\]|\\.)*)'\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path)) !== null) {
    cursor += m[0];
    const label = m[1] != null ? m[1] : m[2] != null ? `[${m[2]}]` : m[3];
    segs.push({ label, path: cursor });
  }
  return segs;
}

export default function Breadcrumbs({
  path,
  onSelect,
}: {
  path: string;
  onSelect: (path: string) => void;
}) {
  const segs = parsePath(path);
  return (
    <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-t border-border bg-bg-soft px-2 py-1 text-xs">
      {segs.map((s, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="text-gray-600">›</span>}
          <button
            onClick={() => onSelect(s.path)}
            title={s.path}
            className={`whitespace-nowrap rounded px-1 font-mono hover:bg-bg-softer ${
              i === segs.length - 1
                ? "text-gray-100"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {s.label}
          </button>
        </Fragment>
      ))}
    </div>
  );
}
