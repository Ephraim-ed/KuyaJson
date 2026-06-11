"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { EditorView } from "@codemirror/view";
import { EditorSelection } from "@codemirror/state";
import { lintGutter, setDiagnostics, type Diagnostic } from "@codemirror/lint";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";
import { useTheme } from "./theme";

export interface EditorMarker {
  /** 0-based character offset. */
  from: number;
  to: number;
  message: string;
  severity?: "error" | "warning" | "info";
}

/** Imperative handle: select and scroll to a source range. */
export interface JsonEditorHandle {
  focusRange: (from: number, to: number, opts?: { focus?: boolean }) => void;
}

interface Props {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  markers?: EditorMarker[];
  /** Language hint; defaults to JSON. Pass "text" for plain output. */
  language?: "json" | "text";
  /** Editor font size in px (zoom). */
  fontSize?: number;
  /** Fired when the user (not code) changes the selection/cursor. */
  onUserSelect?: () => void;
}

const wrap = EditorView.lineWrapping;

const JsonEditor = forwardRef<JsonEditorHandle, Props>(function JsonEditor(
  {
    value,
    onChange,
    readOnly = false,
    placeholder,
    markers,
    language = "json",
    fontSize = 13,
    onUserSelect,
  },
  handleRef,
) {
  const ref = useRef<ReactCodeMirrorRef>(null);
  const { theme } = useTheme();
  const onUserSelectRef = useRef(onUserSelect);
  onUserSelectRef.current = onUserSelect;

  useImperativeHandle(handleRef, () => ({
    focusRange(from: number, to: number, opts?: { focus?: boolean }) {
      const view = ref.current?.view;
      if (!view) return;
      const len = view.state.doc.length;
      const a = Math.max(0, Math.min(from, len));
      const b = Math.max(a, Math.min(to, len));
      view.dispatch({
        selection: EditorSelection.range(a, b),
        scrollIntoView: true,
      });
      if (opts?.focus !== false) view.focus();
    },
  }));

  const extensions = useMemo(() => {
    const ext = [
      wrap,
      EditorView.updateListener.of((u) => {
        if (
          u.selectionSet &&
          u.transactions.some((t) => t.isUserEvent("select"))
        ) {
          onUserSelectRef.current?.();
        }
      }),
    ];
    if (language === "json") ext.push(json(), lintGutter());
    return ext;
  }, [language]);

  // Re-apply diagnostics whenever markers change.
  useEffect(() => {
    const view = ref.current?.view;
    if (!view) return;
    const docLen = view.state.doc.length;
    const diagnostics: Diagnostic[] = (markers ?? []).map((m) => ({
      from: Math.min(m.from, docLen),
      to: Math.min(Math.max(m.to, m.from + 1), docLen),
      severity: m.severity ?? "error",
      message: m.message,
    }));
    view.dispatch(setDiagnostics(view.state, diagnostics));
  }, [markers, value]);

  return (
    <CodeMirror
      ref={ref}
      value={value}
      theme={theme === "light" ? githubLight : githubDark}
      readOnly={readOnly}
      editable={!readOnly}
      placeholder={placeholder}
      extensions={extensions}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: !readOnly,
        foldGutter: true,
        autocompletion: false,
        highlightActiveLineGutter: !readOnly,
        searchKeymap: false, // Cmd/Ctrl+F opens our unified Find modal instead
      }}
      onChange={onChange}
      style={{ height: "100%", fontSize }}
      height="100%"
    />
  );
});

export default JsonEditor;
