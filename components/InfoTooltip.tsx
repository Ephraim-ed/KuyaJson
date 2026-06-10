"use client";

import { useState } from "react";

/** A small "ⓘ" icon that reveals help text on hover/focus. */
export default function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <button
        type="button"
        aria-label="How to use this tool"
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onClick={() => setShow((s) => !s)}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-600 text-[10px] font-bold text-gray-400 hover:border-accent hover:text-accent"
      >
        i
      </button>
      {show && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-6 z-50 w-72 max-w-[80vw] -translate-x-1/2 rounded-md border border-border bg-bg-softer px-3 py-2 text-xs font-normal leading-relaxed text-gray-200 shadow-xl"
        >
          {text}
        </span>
      )}
    </span>
  );
}
