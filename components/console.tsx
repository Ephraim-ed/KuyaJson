"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ConsoleLevel = "error" | "warn" | "ok" | "info";

export interface ConsoleMessage {
  id: number;
  level: ConsoleLevel;
  text: string;
  at: number;
  /** Optional source label, e.g. "validate", "repair". */
  source?: string;
}

interface ConsoleCtx {
  messages: ConsoleMessage[];
  push: (level: ConsoleLevel, text: string, source?: string) => void;
  /** Remove all messages from a source (e.g. when its error is fixed). */
  clearSource: (source: string) => void;
  clear: () => void;
}

const Ctx = createContext<ConsoleCtx>({
  messages: [],
  push: () => {},
  clearSource: () => {},
  clear: () => {},
});

export function ConsoleProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const idRef = useRef(0);

  const push = useCallback(
    (level: ConsoleLevel, text: string, source?: string) => {
      setMessages((m) => {
        const last = m[m.length - 1];
        // Skip consecutive duplicates (e.g. live validation on each keystroke).
        if (last && last.level === level && last.text === text && last.source === source) {
          return m;
        }
        return [...m, { id: idRef.current++, level, text, at: Date.now(), source }].slice(
          -200,
        );
      });
    },
    [],
  );

  const clearSource = useCallback((source: string) => {
    setMessages((m) => m.filter((x) => x.source !== source));
  }, []);

  const clear = useCallback(() => setMessages([]), []);

  return (
    <Ctx.Provider value={{ messages, push, clearSource, clear }}>
      {children}
    </Ctx.Provider>
  );
}

export function useConsole() {
  return useContext(Ctx);
}

const LEVEL_STYLE: Record<ConsoleLevel, string> = {
  error: "text-red-400",
  warn: "text-amber-300",
  ok: "text-green-400",
  info: "text-gray-400",
};
const LEVEL_ICON: Record<ConsoleLevel, string> = {
  error: "✕",
  warn: "!",
  ok: "✓",
  info: "•",
};

function fmtTime(at: number): string {
  const d = new Date(at);
  return d.toLocaleTimeString(undefined, { hour12: false });
}

const MIN_H = 60;
const MAX_H = 480;
const HEIGHT_KEY = "console:height";

/** The console panel: a collapsible, resizable, scrollable log of checks. */
export function ConsolePanel() {
  const { messages, clear } = useConsole();
  const [open, setOpen] = useState(false);
  const prevCount = useRef(0);

  // Keep the console minimized while empty; auto-open when messages arrive.
  useEffect(() => {
    if (messages.length === 0) setOpen(false);
    else if (prevCount.current === 0) setOpen(true);
    prevCount.current = messages.length;
  }, [messages.length]);
  const [height, setHeight] = useState(120);
  const [dragging, setDragging] = useState(false);
  const start = useRef({ y: 0, h: 0 });
  const heightRef = useRef(height);
  heightRef.current = height;
  const endRef = useRef<HTMLDivElement>(null);

  const errors = messages.filter((m) => m.level === "error").length;

  // Restore persisted height.
  useEffect(() => {
    const s = localStorage.getItem(HEIGHT_KEY);
    if (s) {
      const v = Number(s);
      if (!Number.isNaN(v)) setHeight(Math.min(MAX_H, Math.max(MIN_H, v)));
    }
  }, []);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, open]);

  // Drag-to-resize (dragging the top edge upward grows the console).
  useEffect(() => {
    if (!dragging) return;
    const move = (e: MouseEvent) => {
      e.preventDefault();
      const next = Math.min(MAX_H, Math.max(MIN_H, start.current.h + (start.current.y - e.clientY)));
      setHeight(next);
    };
    const up = () => {
      setDragging(false);
      localStorage.setItem(HEIGHT_KEY, String(heightRef.current));
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [dragging]);

  return (
    <div
      className={`flex shrink-0 flex-col border-t border-border bg-bg ${
        dragging ? "select-none" : ""
      }`}
    >
      {open && (
        <div
          onMouseDown={(e) => {
            start.current = { y: e.clientY, h: height };
            setDragging(true);
          }}
          title="Drag to resize"
          className={`h-1.5 shrink-0 cursor-row-resize ${
            dragging ? "bg-accent" : "hover:bg-accent"
          }`}
        />
      )}
      <div className="flex items-center gap-2 px-2 py-1">
        <button
          onClick={() => setOpen((o) => !o)}
          title={open ? "Collapse console" : "Expand console"}
          className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-400 hover:text-gray-200"
        >
          <span
            className={`inline-block text-sm leading-none transition-transform ${
              open ? "rotate-90" : ""
            }`}
          >
            ›
          </span>
          Console
        </button>
        {errors > 0 && (
          <span className="rounded bg-red-950 px-1.5 text-[10px] text-red-300">
            {errors} error{errors === 1 ? "" : "s"}
          </span>
        )}
        <span className="text-[10px] text-gray-600">{messages.length} msg</span>
        <button
          onClick={clear}
          disabled={messages.length === 0}
          className="ml-auto px-1 text-xs text-gray-500 hover:text-gray-200 disabled:opacity-40"
          title="Clear console"
        >
          Clear
        </button>
      </div>
      {open && (
        <div
          style={{ height }}
          className="overflow-auto px-2 pb-1 font-mono text-xs"
        >
          {messages.length === 0 ? (
            <p className="py-1 text-gray-600">
              Checks (validate, repair, schema) will report here.
            </p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="flex items-start gap-2 py-0.5">
                <span className="text-[10px] text-gray-600">{fmtTime(m.at)}</span>
                <span className={LEVEL_STYLE[m.level]}>{LEVEL_ICON[m.level]}</span>
                {m.source && <span className="text-gray-500">[{m.source}]</span>}
                <span className={`flex-1 ${LEVEL_STYLE[m.level]}`}>{m.text}</span>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
}
