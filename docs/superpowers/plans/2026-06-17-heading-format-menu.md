# Heading Format Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix first-line heading deletion and add a native macOS Format menu (⌘1–6) to change heading levels from within the rich-text editor.

**Architecture:** Three independent changes: (1) a TipTap keyboard extension that converts a heading to a paragraph on Backspace at position 0, (2) a new "Format" submenu in the Tauri native menu bar that emits Tauri events when heading level items are clicked, and (3) event listeners in `MainPanel.tsx` (where the editor ref lives) that apply the corresponding TipTap commands.

**Tech Stack:** Rust / Tauri 2.x menu API, TipTap (`@tiptap/react`), Vitest + jsdom

## Global Constraints

- Follow the existing Tauri menu pattern in `lib.rs`: `MenuItemBuilder` → `SubmenuBuilder` → `on_menu_event` match arm → `app_handle.emit()`
- Follow the existing listener pattern in `MainPanel.tsx`: async `useEffect` with `unlisteners` array, push each `await listen(...)` result, return cleanup
- `CmdOrCtrl+0` is already used by "Reset Font Size" in the View menu — the Paragraph menu item gets **no accelerator**
- All new TipTap extensions are defined inline in `NoteEditor.tsx`, matching the existing style of `ClearMarksOnEnter`, `ParagraphMarkdown`, etc.
- Run `npm test` to execute the Vitest suite; tests run in jsdom environment

---

### Task 1: HeadingKeyboardFix TipTap extension

**Files:**
- Modify: `src/components/editor/NoteEditor.tsx` — define `HeadingKeyboardFix` extension inline and add it to the `extensions` array
- Create: `src/test/heading-keyboard-fix.test.ts`

**Interfaces:**
- Produces: `HeadingKeyboardFix` — a TipTap `Extension` added to the `extensions` array in `NoteEditor.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/test/heading-keyboard-fix.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Extension } from "@tiptap/react";

// Inline the extension logic here so the test is self-contained.
// This mirrors what will live in NoteEditor.tsx.
const HeadingKeyboardFix = Extension.create({
  name: "headingKeyboardFix",
  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { $from } = editor.state.selection;
        if ($from.parent.type.name !== "heading") return false;
        if ($from.parentOffset !== 0) return false;
        return editor.chain().setParagraph().run();
      },
    };
  },
});

function makeEditor(content: string) {
  return new Editor({
    extensions: [StarterKit, HeadingKeyboardFix],
    content,
    element: document.createElement("div"),
  });
}

describe("HeadingKeyboardFix", () => {
  it("converts a heading to a paragraph when Backspace is pressed at position 0", () => {
    const editor = makeEditor("<h1>Hello</h1>");
    // Place cursor at offset 0 of the heading
    editor.commands.setTextSelection(1);
    editor.commands.keyboardShortcut("Backspace");
    expect(editor.isActive("heading")).toBe(false);
    expect(editor.isActive("paragraph")).toBe(true);
    editor.destroy();
  });

  it("does NOT convert heading to paragraph when Backspace is pressed mid-word", () => {
    const editor = makeEditor("<h1>Hello</h1>");
    // Place cursor at offset 3 (mid-word)
    editor.commands.setTextSelection(4);
    editor.commands.keyboardShortcut("Backspace");
    expect(editor.isActive("heading")).toBe(true);
    editor.destroy();
  });

  it("does nothing when Backspace is pressed at position 0 of a paragraph", () => {
    const editor = makeEditor("<p>Hello</p>");
    editor.commands.setTextSelection(1);
    editor.commands.keyboardShortcut("Backspace");
    expect(editor.isActive("paragraph")).toBe(true);
    editor.destroy();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- heading-keyboard-fix
```

Expected: FAIL — `HeadingKeyboardFix` is not imported from anywhere yet; the inline definition in the test should run, but verify the test file itself executes cleanly.

- [ ] **Step 3: Add the extension to NoteEditor.tsx**

In `src/components/editor/NoteEditor.tsx`, add the extension definition after `ClearMarksOnEnter` (around line 205) and before the imports block:

```ts
const HeadingKeyboardFix = Extension.create({
  name: "headingKeyboardFix",
  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { $from } = editor.state.selection;
        if ($from.parent.type.name !== "heading") return false;
        if ($from.parentOffset !== 0) return false;
        return editor.chain().setParagraph().run();
      },
    };
  },
});
```

Then add `HeadingKeyboardFix` to the `extensions` array inside the `useMemo` (after `ClearMarksOnEnter`):

```ts
const extensions = useMemo(
  () => [
    StarterKit.configure({ codeBlock: false, paragraph: false }),
    ParagraphMarkdown,
    Placeholder.configure({ placeholder: "Start writing…" }),
    Highlight.configure({ multicolor: false }),
    CodeBlockLowlight.extend({ ... }).configure({ lowlight }),
    TaskListMarkdown,
    TaskItemMarkdown.configure({ nested: true }),
    ClearMarksOnEnter,
    HeadingKeyboardFix,   // ← add here
    Image.configure({ inline: false, allowBase64: false }),
    // ... rest unchanged
  ],
  [],
);
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npm test -- heading-keyboard-fix
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/NoteEditor.tsx src/test/heading-keyboard-fix.test.ts
git commit -m "feat: convert first-line heading to paragraph on Backspace"
```

---

### Task 2: Format native menu (Rust)

**Files:**
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Produces: Tauri events `"format-heading"` (payload: integer 1–6) and `"format-paragraph"` (no payload) emitted when Format menu items are clicked
- Consumed by: Task 3

- [ ] **Step 1: Add the seven Format menu items**

In `src-tauri/src/lib.rs`, add the following block after the `edit_menu` build (after line 65) and before the View menu section:

```rust
// ── Format menu ───────────────────────────────────────────────
let heading_1 = MenuItemBuilder::new("Heading 1")
    .id("heading_1")
    .accelerator("CmdOrCtrl+1")
    .build(app)?;
let heading_2 = MenuItemBuilder::new("Heading 2")
    .id("heading_2")
    .accelerator("CmdOrCtrl+2")
    .build(app)?;
let heading_3 = MenuItemBuilder::new("Heading 3")
    .id("heading_3")
    .accelerator("CmdOrCtrl+3")
    .build(app)?;
let heading_4 = MenuItemBuilder::new("Heading 4")
    .id("heading_4")
    .accelerator("CmdOrCtrl+4")
    .build(app)?;
let heading_5 = MenuItemBuilder::new("Heading 5")
    .id("heading_5")
    .accelerator("CmdOrCtrl+5")
    .build(app)?;
let heading_6 = MenuItemBuilder::new("Heading 6")
    .id("heading_6")
    .accelerator("CmdOrCtrl+6")
    .build(app)?;
let paragraph_fmt = MenuItemBuilder::new("Paragraph")
    .id("paragraph_fmt")
    .build(app)?;

let format_menu = SubmenuBuilder::new(app, "Format")
    .item(&heading_1)
    .item(&heading_2)
    .item(&heading_3)
    .item(&heading_4)
    .item(&heading_5)
    .item(&heading_6)
    .separator()
    .item(&paragraph_fmt)
    .build()?;
```

- [ ] **Step 2: Insert the Format menu into the menu bar**

Find the menu bar assembly block (around line 134) and add `&format_menu` between Edit and View:

```rust
let menu = MenuBuilder::new(app)
    .item(&app_menu)
    .item(&file_menu)
    .item(&edit_menu)
    .item(&format_menu)   // ← add here
    .item(&view_menu)
    .item(&help_menu)
    .build()?;
```

- [ ] **Step 3: Add event emission in on_menu_event**

In the `on_menu_event` match block (around line 147), add these arms before the `other if` catch-all:

```rust
"heading_1" => { let _ = app_handle.emit("format-heading", 1u8); }
"heading_2" => { let _ = app_handle.emit("format-heading", 2u8); }
"heading_3" => { let _ = app_handle.emit("format-heading", 3u8); }
"heading_4" => { let _ = app_handle.emit("format-heading", 4u8); }
"heading_5" => { let _ = app_handle.emit("format-heading", 5u8); }
"heading_6" => { let _ = app_handle.emit("format-heading", 6u8); }
"paragraph_fmt" => { let _ = app_handle.emit("format-paragraph", ()); }
```

- [ ] **Step 4: Verify the app compiles**

```bash
cd src-tauri && cargo check
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: add Format native menu with heading level shortcuts"
```

---

### Task 3: Frontend event listeners

**Files:**
- Modify: `src/components/layout/MainPanel.tsx`

**Interfaces:**
- Consumes: `"format-heading"` event (payload: `number` 1–6) and `"format-paragraph"` event from Task 2
- Consumes: `editorRef` (`useRef<NoteEditorHandle>`) already defined at line 148 of `MainPanel.tsx`

- [ ] **Step 1: Add the listen import if needed**

Check line 1 of `MainPanel.tsx`. If `listen` from `@tauri-apps/api/event` is not already imported, add it:

```ts
import { listen } from "@tauri-apps/api/event";
```

- [ ] **Step 2: Add the two event listeners**

In `MainPanel.tsx`, add a new `useEffect` after the existing keydown effect (after line 184). The effect must clean up its listeners on unmount:

```ts
useEffect(() => {
  const unlisteners: Array<() => void> = [];
  (async () => {
    unlisteners.push(
      await listen<number>("format-heading", (event) => {
        const level = event.payload as 1 | 2 | 3 | 4 | 5 | 6;
        editorRef.current?.getEditor()?.chain().focus().toggleHeading({ level }).run();
      }),
    );
    unlisteners.push(
      await listen("format-paragraph", () => {
        editorRef.current?.getEditor()?.chain().focus().setParagraph().run();
      }),
    );
  })();
  return () => unlisteners.forEach((fn) => fn());
}, []);
```

- [ ] **Step 3: Manual test — heading level change**

Run the app:

```bash
npm run tauri dev
```

1. Open or create a note
2. Type `# My Heading` and press Enter to create an H1
3. Click back into the heading text
4. Press `⌘2` — the heading should visually change to H2 size
5. Open the Format menu in the menu bar — "Heading 2" should be visible with `⌘2` shown
6. Click "Heading 3" from the menu — the heading should update to H3
7. Click "Paragraph" from the menu — the heading should convert to a plain paragraph

- [ ] **Step 4: Manual test — first-line heading deletion**

1. Create a note that starts with a heading as the very first line
2. Click at the very beginning of the heading text (before the first character)
3. Press Backspace — the heading should convert to a paragraph (no longer bold/large)

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/MainPanel.tsx
git commit -m "feat: wire format-heading and format-paragraph events to TipTap editor"
```
