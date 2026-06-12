"use client";

import { useEffect, useRef, useState } from "react";

/** Types out `text` one character at a time with a blinking caret. */
export default function Typewriter({
  text,
  speed = 45,
  className,
}: {
  text: string;
  speed?: number;
  className?: string;
}) {
  const [n, setN] = useState(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced.current) {
      setN(text.length);
      return;
    }
    setN(0);
    const id = window.setInterval(() => {
      setN((c) => {
        if (c >= text.length) {
          window.clearInterval(id);
          return c;
        }
        return c + 1;
      });
    }, speed);
    return () => window.clearInterval(id);
  }, [text, speed]);

  return (
    <span className={className}>
      {text.slice(0, n)}
      <span
        className="animate-caret ml-px inline-block w-px bg-current align-text-bottom"
        style={{ height: "1em" }}
      />
    </span>
  );
}
