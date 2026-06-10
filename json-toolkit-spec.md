# JSON Toolkit — Project Spec

A privacy-first app for managing, transforming, and anonymizing JSON. All processing happens client-side — no JSON ever leaves the user's machine.

## Core Principles

- **Client-side only**: No server uploads. This is the key differentiator since users often work with sensitive data.
- **Handles large files**: Use streaming/lazy parsing so 100MB+ files don't freeze the UI.
- **Helpful errors**: Never just say "invalid JSON" — show line/column and a human-readable explanation.

---

## Features

### Phase 1 — MVP

#### 1. Format / Beautify
- Pretty-print with configurable indentation (2 spaces, 4 spaces, tabs)
- Minify toggle (inverse operation, compress for production use)

#### 2. Validate
- Syntax checking with exact error location (line + column)
- Human-readable error messages (e.g., "missing comma after value on line 12", "trailing commas are not allowed in JSON")
- Inline error highlighting in the editor

#### 3. Anonymize
- **Rule-based masking**: User defines which fields to anonymize via:
  - Key name matching (exact, glob, or regex)
  - JSONPath selectors
- **Realistic fake data**: Replace values with plausible fakes (names, emails, phone numbers, addresses) rather than `***`, so the structure remains testable
- **Consistent mapping**: The same input value always maps to the same fake output within a session, preserving referential integrity (e.g., the same user ID appearing in 5 places gets the same fake ID in all 5)
- **PII auto-detection**: Scan and flag likely sensitive fields automatically:
  - Email patterns
  - Phone numbers
  - SSNs
  - Credit card numbers
  - IP addresses
  - Names (heuristic, based on key names like `firstName`, `last_name`)
- One-click "anonymize all detected PII"

#### 4. Tree Viewer
- Collapsible/expandable hierarchical view
- Show value types and array/object sizes (e.g., `users [24 items]`)
- Click a node to copy its JSONPath or value

### Phase 2 — Power Tools

#### 5. Search & Query
- Plain-text search across keys and values
- JSONPath query support with live results
- Filter view: show only matching subtrees

#### 6. Diff / Compare
- Side-by-side comparison of two JSON documents
- Highlight added / removed / changed values
- Option to ignore key order and whitespace
- Structural diff (semantic), not just text diff

#### 7. Repair Mode
- Auto-fix common issues:
  - Single quotes → double quotes
  - Unquoted keys → quoted keys
  - Trailing commas removed
  - Comments stripped (JSON5/JSONC-style input)
  - Python literals (`True`, `None`) → JSON (`true`, `null`)
- Show a summary of fixes applied

#### 8. Conversion
- JSON → CSV (with flattening options for nested data)
- JSON ↔ YAML
- JSON ↔ XML
- JSON → TypeScript interfaces
- JSON → Python dataclasses / Pydantic models
- JSON → Go structs

### Phase 3 — Nice to Have

#### 9. Schema Tools
- Validate against a JSON Schema (draft 2020-12)
- Generate a JSON Schema from a sample document

#### 10. Transformations
- Sort keys (alphabetical, recursive, or custom order)
- Flatten to dot-notation key/value pairs and unflatten back
- Merge multiple JSON files with conflict-resolution strategies (last-wins, first-wins, deep merge)

#### 11. Quality of Life
- Operation history with undo/redo
- Drag-and-drop file loading
- Copy result to clipboard / download as file
- Dark mode
- Keyboard shortcuts for common actions

---

## Suggested Tech Notes

- **Editor**: CodeMirror 6 or Monaco for the text editor (syntax highlighting, error markers, large-file performance)
- **Fake data**: `@faker-js/faker` for realistic anonymization values
- **JSONPath**: `jsonpath-plus` or JMESPath
- **YAML**: `js-yaml`
- **Diffing**: structural diff library or custom implementation on parsed objects
- **Large files**: consider a streaming parser (e.g., `clarinet` / `stream-json`) or Web Workers to keep the UI responsive

## UI Layout Suggestion

- Left panel: input editor
- Right panel: output (formatted result, tree view, or diff depending on active tool)
- Top toolbar: tool selector (Format | Validate | Anonymize | Tree | Diff | Convert | ...)
- Anonymize tool gets a side drawer for rule configuration and detected-PII review

## Non-Goals (for now)

- No accounts, no cloud sync, no server-side processing
- No collaborative editing
- No API/backend — this is a fully static app
