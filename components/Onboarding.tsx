"use client";

import { useEffect, useState } from "react";
import {
  Braces,
  Folders,
  ListTree,
  Search,
  SunMoon,
  Terminal,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Button } from "./ui";
import KuyaSprite from "./KuyaSprite";

interface Feature {
  Icon: LucideIcon;
  title: string;
  desc: string;
}

const PAGES: { title: string; subtitle: string; features: Feature[] }[] = [
  {
    title: "Welcome to Kuya Json",
    subtitle:
      "A privacy-first JSON toolkit — everything runs in your browser. Nothing is ever uploaded.",
    features: [
      {
        Icon: Wrench,
        title: "Tools",
        desc: "Format, Anonymize, Convert, Diff, Schema and Transform — pick one from the top bar.",
      },
      {
        Icon: Folders,
        title: "Workspaces",
        desc: "Keep multiple JSON documents in tabs. They're saved automatically and restored next time.",
      },
      {
        Icon: Braces,
        title: "Your document",
        desc: "Paste JSON, drop a file, or hit Sample. Format also validates, repairs and unescapes.",
      },
    ],
  },
  {
    title: "Find your way around",
    subtitle: "A few things that make working with big JSON fast.",
    features: [
      {
        Icon: ListTree,
        title: "Structure tree",
        desc: "Click any node to jump to it. Search, expand by level, or open a subtree in a new workspace.",
      },
      {
        Icon: Search,
        title: "Find & Replace",
        desc: "Press ⌘F / Ctrl+F (or ⌘K) for find, replace, regex and JSONPath. Results land in the Output panel.",
      },
      {
        Icon: Terminal,
        title: "Console & Output",
        desc: "The bottom dock shows validation/repair messages and conversion output. Click an error to jump to its line.",
      },
      {
        Icon: SunMoon,
        title: "Theme & zoom",
        desc: "Toggle light/dark in the header, and zoom the editor and tree independently.",
      },
    ],
  },
];

export default function Onboarding({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (open) setPage(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isLast = page === PAGES.length - 1;
  const p = PAGES[page];

  return (
    <div
      className="animate-kuya-fade fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="animate-kuya-pop flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-bg-soft shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero banner with the mascot */}
        <div className="relative flex flex-col items-center bg-gradient-to-br from-accent/25 via-bg-soft to-purple-500/10 px-5 pb-3 pt-5">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 px-1 text-gray-400 hover:text-gray-200"
            aria-label="Close"
          >
            ✕
          </button>
          <KuyaSprite />
          <span className="mt-1 text-[11px] uppercase tracking-widest text-gray-500">
            Kuya Json
          </span>
        </div>

        <div className="px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-100">{p.title}</h2>
          <p className="mt-1 text-sm text-gray-400">{p.subtitle}</p>

          <div className="mt-4 space-y-3">
            {p.features.map((f, i) => {
              const Icon = f.Icon;
              return (
                <div
                  key={f.title}
                  className="kuya-rise flex items-start gap-3"
                  style={{ animationDelay: `${i * 80 + 80}ms` }}
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                    <Icon size={18} />
                  </span>
                  <div>
                    <div className="text-sm font-medium text-gray-200">{f.title}</div>
                    <div className="text-xs leading-relaxed text-gray-400">{f.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-border px-5 py-3">
          <div className="flex gap-1.5">
            {PAGES.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === page ? "w-5 bg-accent" : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>
          <button
            onClick={onClose}
            className="ml-auto px-2 text-xs text-gray-500 hover:text-gray-300"
          >
            Skip
          </button>
          {page > 0 && <Button onClick={() => setPage((n) => n - 1)}>Back</Button>}
          {isLast ? (
            <Button variant="primary" onClick={onClose}>
              Get started
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setPage((n) => n + 1)}>
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
