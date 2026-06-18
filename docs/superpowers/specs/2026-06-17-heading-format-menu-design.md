# Heading Format Menu & Deletion Fix

**Date:** 2026-06-17  
**Status:** Approved

## Problem

Two related editor limitations:

1. When a heading is the first block in a note, Backspace does nothing — the user cannot convert it to a paragraph without switching to raw markdown view.
2. There is no way to change a heading's level (e.g. H1 → H2) from within the rich-text editor.

## Solution

### Fix 1 — First-line heading deletion (NoteEditor.tsx)

A new `HeadingKeyboardFix` TipTap extension adds a single `Backspace` keyboard handler. When the cursor is at offset 0 of any heading node, it calls `setParagraph()` to convert the heading to a paragraph instead of doing nothing.

This extension is appended to the existing `extensions` array in `NoteEditor.tsx`.

### Fix 2 — Format native menu (lib.rs)

A new "Format" submenu is added to the macOS menu bar between Edit and View.

**Menu items:**

| Label      | ID               | Accelerator      |
|------------|------------------|------------------|
| Heading 1  | `heading_1`      | `CmdOrCtrl+1`    |
| Heading 2  | `heading_2`      | `CmdOrCtrl+2`    |
| Heading 3  | `heading_3`      | `CmdOrCtrl+3`    |
| Heading 4  | `heading_4`      | `CmdOrCtrl+4`    |
| Heading 5  | `heading_5`      | `CmdOrCtrl+5`    |
| Heading 6  | `heading_6`      | `CmdOrCtrl+6`    |
| *(separator)* |               |                  |
| Paragraph  | `paragraph_fmt`  | `CmdOrCtrl+0`    |

The accelerators are registered at the OS level (native macOS menu), which bypasses the WebView — this is why `⌘1–6` work here when they would not as TipTap keyboard shortcuts.

In `on_menu_event`:
- `heading_1` through `heading_6` → emit `"format-heading"` with integer payload (1–6)
- `paragraph_fmt` → emit `"format-paragraph"` with no payload

### Fix 2 — Frontend event listeners (MainPanel.tsx)

Two new `listen` calls are added to the existing event-setup `useEffect` alongside the existing `font-size-change`, `set-theme`, etc. listeners.

```ts
listen<number>("format-heading", (event) => {
  editorRef.current?.getEditor()
    ?.chain().focus().toggleHeading({ level: event.payload as 1|2|3|4|5|6 }).run();
});

listen("format-paragraph", () => {
  editorRef.current?.getEditor()
    ?.chain().focus().setParagraph().run();
});
```

Both listeners are pushed to the `unlisteners` array so they clean up on unmount.

## Files Changed

| File | Change |
|------|--------|
| `src-tauri/src/lib.rs` | Add Format submenu, 7 menu items, emit events in `on_menu_event` |
| `src/components/layout/MainPanel.tsx` | Add 2 event listeners for `format-heading` and `format-paragraph` |
| `src/components/editor/NoteEditor.tsx` | Add `HeadingKeyboardFix` extension to the extensions array |

## Out of Scope

- Heading folding / section collapse
- Copy link to heading
- Visual gutter indicator (≡N) — the Format menu is the only UI affordance
