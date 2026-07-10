import { type Editor, Extension } from "@tiptap/core";
import Paragraph from "@tiptap/extension-paragraph";
import { TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

/**
 * Shared, framework-free editor building blocks used by NoteEditor.
 *
 * These live in their own module (rather than inline in NoteEditor.tsx) so the
 * editor's tests can import and exercise the *real* implementations instead of
 * mirroring copies. Nothing here depends on React or Tauri.
 */

/** Non-breaking space used as the placeholder that survives markdown round-trips. */
const NBSP = " ";

// Extends Paragraph to preserve blank lines (empty paragraphs) through markdown round-trips.
// Empty paragraphs are serialized as a single NBSP character so markdown-it doesn't collapse
// them, and a preprocessor restores them when parsing content that has extra blank lines.
export const ParagraphMarkdown = Paragraph.extend({
  addStorage() {
    return {
      markdown: {
        // biome-ignore lint/suspicious/noExplicitAny: tiptap-markdown serializer types are not exported
        serialize(state: any, node: any) {
          if (node.childCount === 0 || node.textContent === NBSP) {
            state.write(NBSP); // NBSP placeholder — survives markdown round-trip
          } else {
            state.renderInline(node);
          }
          state.closeBlock(node);
        },
        parse: {
          // biome-ignore lint/suspicious/noExplicitAny: markdown-it instance type not exported by tiptap-markdown
          setup(md: any) {
            if (!md.__blankLinesAdded) {
              // Convert runs of 3+ newlines (extra blank lines) into NBSP placeholder paragraphs
              // so they survive the markdown-it block parser which collapses multiple blank lines.
              // biome-ignore lint/suspicious/noExplicitAny: markdown-it core ruler state not exported
              md.core.ruler.before("block", "preserve-blank-lines", (state: any) => {
                state.src = state.src.replace(/\n{3,}/g, (match: string) => {
                  const extraBlanks = match.length - 2;
                  return `\n\n${`${NBSP}\n\n`.repeat(extraBlanks)}`;
                });
              });
              md.__blankLinesAdded = true;
            }
          },
        },
      },
    };
  },
});

// Give the user a text slot between/around back-to-back code blocks.
// When two code blocks are adjacent there is no paragraph between them, so a
// cursor can't land there and content can't be inserted. Pressing ArrowDown at
// the end of a code block whose next sibling is another code block (or that sits
// at the end of the doc) inserts an empty paragraph after it; ArrowUp at the
// start of a code block whose previous sibling is another code block (or that is
// the first node) inserts one before it. All other cases return false so normal
// arrow navigation is untouched. Pairs with the .ProseMirror-gapcursor CSS in
// globals.css that makes the click-between gap visible.
export const CodeBlockGapCursor = Extension.create({
  name: "codeBlockGapCursor",
  addKeyboardShortcuts() {
    const insertParagraph = (editor: Editor, side: "before" | "after"): boolean => {
      const { state } = editor;
      const { $from, empty } = state.selection;
      if (!empty) return false;
      if ($from.parent.type.name !== "codeBlock") return false;

      // Only act at the very start (ArrowUp) or very end (ArrowDown) of the block,
      // so mid-block arrow presses navigate lines normally.
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

      // Bail unless default navigation would otherwise trap the user: an adjacent
      // code block leaves no landing slot, and a code block at the doc edge has none.
      if (!siblingIsCodeBlock && !atDocEdge) return false;

      const insertPos =
        side === "before" ? $from.before(codeBlockDepth) : $from.after(codeBlockDepth);
      return editor.commands.command(({ tr, dispatch }) => {
        const paragraph = state.schema.nodes.paragraph.create();
        tr.insert(insertPos, paragraph);
        // Cursor lands inside the new empty paragraph (insertPos + 1 = its content start).
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

/**
 * Handle a plain-text paste. Inside a code block the text is inserted verbatim
 * (tiptap-markdown's clipboardTextParser would otherwise re-parse braces/newlines
 * as document structure and spill content out of the block). Elsewhere it routes
 * through the markdown clipboardTextParser, falling back to a literal insert.
 *
 * Returns true when it handled the paste (the caller should then preventDefault).
 */
export function handleTextPaste(view: EditorView, text: string | undefined): boolean {
  if (!text) return false;

  // Inside a code block: paste verbatim, preserving newlines/indentation.
  if (view.state.selection.$from.parent.type.name === "codeBlock") {
    view.dispatch(view.state.tr.insertText(text));
    return true;
  }

  // Otherwise let tiptap-markdown's clipboardTextParser interpret the text,
  // bypassing ProseMirror's default which would prefer text/html.
  let handled = false;
  // biome-ignore lint/suspicious/noExplicitAny: ProseMirror someProp callback is untyped
  view.someProp("clipboardTextParser", (f: any) => {
    const slice = f(text, view.state.selection.$from, false, view);
    if (slice) {
      view.dispatch(view.state.tr.replaceSelection(slice));
      handled = true;
    }
    return !!slice;
  });
  if (!handled) view.dispatch(view.state.tr.insertText(text));
  return true;
}
