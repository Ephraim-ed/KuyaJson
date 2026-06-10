"use client";

import { type ReactNode } from "react";
import Split from "../Split";

interface Props {
  /** Top control bar (buttons, selects, inline messages). */
  controls: ReactNode;
  /** The shared document editor. */
  editor: ReactNode;
  /** Optional results region; when present it appears in a resizable bottom pane. */
  results?: ReactNode;
  /** Storage key for the editor/results split size. */
  splitKey?: string;
}

/** Standard single-document tool layout: controls on top, one editor, optional
 *  resizable results below. */
export default function ToolFrame({ controls, editor, results, splitKey }: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {controls}
      <div className="min-h-0 flex-1">
        {results ? (
          <Split
            direction="vertical"
            initial={0.55}
            storageKey={splitKey ?? "tool-results"}
            first={editor}
            second={results}
          />
        ) : (
          editor
        )}
      </div>
    </div>
  );
}
