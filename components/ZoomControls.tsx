"use client";

interface Props {
  size: number;
  setSize: (n: number) => void;
  min?: number;
  max?: number;
  base?: number;
  className?: string;
}

/** Compact zoom control: − / current size (click to reset) / +. */
export default function ZoomControls({
  size,
  setSize,
  min = 9,
  max = 28,
  base = 13,
  className = "",
}: Props) {
  const btn =
    "flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-bg-softer hover:text-gray-200 disabled:opacity-40";
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      <button
        className={btn}
        onClick={() => setSize(Math.max(min, size - 1))}
        disabled={size <= min}
        title="Zoom out"
      >
        −
      </button>
      <button
        onClick={() => setSize(base)}
        title="Reset zoom"
        className="min-w-[34px] rounded px-1 text-center text-[11px] tabular-nums text-gray-400 hover:bg-bg-softer hover:text-gray-200"
      >
        {size}px
      </button>
      <button
        className={btn}
        onClick={() => setSize(Math.min(max, size + 1))}
        disabled={size >= max}
        title="Zoom in"
      >
        +
      </button>
    </div>
  );
}
