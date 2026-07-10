import { Editor } from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { TextSelection } from "@tiptap/pm/state";
import { Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { lowlight } from "../lib/lowlight";
import { describe, expect, it } from "vitest";

// Mirror of the CodeBlockGapCursor extension that lives in NoteEditor.tsx.
// Keep this inline so the test is self-contained (same convention as
// heading-keyboard-fix.test.ts).
const CodeBlockGapCursor = Extension.create({
  name: "codeBlockGapCursor",
  addKeyboardShortcuts() {
    // Insert an empty paragraph adjacent to the current code block when the
    // neighbour in the arrow direction is another code block (or the doc edge),
    // so the user always has a text slot between/around back-to-back blocks.
    const insertParagraph = (
      editor: Editor,
      side: "before" | "after",
    ): boolean => {
      const { state } = editor;
      const { $from, empty } = state.selection;
      if (!empty) return false;
      if ($from.parent.type.name !== "codeBlock") return false;

      // Must be at the very start (ArrowUp) or very end (ArrowDown) of the block.
      const atStart = $from.parentOffset === 0;
      const atEnd = $from.parentOffset === $from.parent.content.size;
      if (side === "before" && !atStart) return false;
      if (side === "after" && !atEnd) return false;

      const codeBlockDepth = $from.depth;
      const index = $from.index(codeBlockDepth - 1);
      const parent = $from.node(codeBlockDepth - 1);
      const sibling =
        side === "before" ? parent.maybeChild(index - 1) : parent.maybeChild(index + 1);
      const siblingIsCodeBlock = sibling?.type.name === "codeBlock";
      const atDocEdge = side === "before" ? index === 0 : index === parent.childCount - 1;

      // Only intervene when default navigation would trap the user: an adjacent
      // code block, or the code block sitting at the very edge of the document.
      if (!siblingIsCodeBlock && !atDocEdge) return false;

      const paragraph = state.schema.nodes.paragraph;
      if (!paragraph) return false;

      const insertPos = side === "before" ? $from.before(codeBlockDepth) : $from.after(codeBlockDepth);
      return editor.commands.command(({ tr, dispatch }) => {
        const paragraphNode = paragraph.create();
        tr.insert(insertPos, paragraphNode);
        tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
        dispatch?.(tr);
        return true;
      });
    };

    return {
      ArrowDown: ({ editor }) => insertParagraph(editor, "after"),
      ArrowUp: ({ editor }) => insertParagraph(editor, "before"),
    };
  },
});

function makeEditor() {
  return new Editor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
      CodeBlockGapCursor,
    ],
    content: {
      type: "doc",
      content: [
        { type: "codeBlock", content: [{ type: "text", text: "first" }] },
        { type: "codeBlock", content: [{ type: "text", text: "second" }] },
      ],
    },
    element: document.createElement("div"),
  });
}

function nodeTypes(editor: Editor): string[] {
  const types: string[] = [];
  editor.state.doc.forEach((node) => types.push(node.type.name));
  return types;
}

// Dispatch the key through the view's real keydown handler (as the browser does),
// so the extension's full transaction — including the selection it sets — is applied.
// TipTap's editor.commands.keyboardShortcut only replays doc-changing steps and drops
// the custom selection, which would not reflect real editor behavior.
function pressKey(editor: Editor, key: "ArrowDown" | "ArrowUp") {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  editor.view.someProp("handleKeyDown", (f) => f(editor.view, event));
}

describe("CodeBlockGapCursor", () => {
  it("inserts a paragraph between two adjacent code blocks on ArrowDown at end of first", () => {
    const editor = makeEditor();
    // "first" occupies positions 1..6; end of first code block is at pos 6.
    editor.commands.setTextSelection(6);
    pressKey(editor, "ArrowDown");

    // A paragraph now sits between the two code blocks. (StarterKit's TrailingNode
    // also keeps a paragraph at the very end of the doc — ignore that here.)
    expect(nodeTypes(editor).slice(0, 3)).toEqual(["codeBlock", "paragraph", "codeBlock"]);
    // Cursor should sit inside the new between-blocks paragraph — typing lands there.
    editor.commands.insertContent("hello");
    expect(editor.state.doc.child(1).type.name).toBe("paragraph");
    expect(editor.state.doc.child(1).textContent).toBe("hello");
    editor.destroy();
  });

  it("inserts a paragraph before the first code block on ArrowUp at its start", () => {
    const editor = makeEditor();
    editor.commands.setTextSelection(1); // start of first code block
    pressKey(editor, "ArrowUp");

    expect(nodeTypes(editor).slice(0, 3)).toEqual(["paragraph", "codeBlock", "codeBlock"]);
    editor.destroy();
  });

  it("does not fire on ArrowDown when the following sibling is a paragraph", () => {
    const editor = new Editor({
      extensions: [
        StarterKit.configure({ codeBlock: false }),
        CodeBlockLowlight.configure({ lowlight }),
        CodeBlockGapCursor,
      ],
      content: {
        type: "doc",
        content: [
          { type: "codeBlock", content: [{ type: "text", text: "code" }] },
          { type: "paragraph", content: [{ type: "text", text: "text" }] },
        ],
      },
      element: document.createElement("div"),
    });
    editor.commands.setTextSelection(5); // end of code block
    pressKey(editor, "ArrowDown");
    // No new paragraph inserted — default navigation handles it.
    expect(nodeTypes(editor)).toEqual(["codeBlock", "paragraph"]);
    editor.destroy();
  });
});
