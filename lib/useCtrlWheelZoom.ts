import { useEffect, useRef, type RefObject } from "react";

/**
 * Ctrl/Cmd + mouse-wheel over `ref` adjusts the font size (zoom), preventing the
 * browser's page zoom. `setSize` should clamp/persist as needed.
 */
export function useCtrlWheelZoom(
  ref: RefObject<HTMLElement | null>,
  size: number,
  setSize: (n: number) => void,
  min = 9,
  max = 28,
) {
  const sizeRef = useRef(size);
  sizeRef.current = size;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const dir = e.deltaY < 0 ? 1 : -1;
      setSize(Math.min(max, Math.max(min, sizeRef.current + dir)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [ref, setSize, min, max]);
}
