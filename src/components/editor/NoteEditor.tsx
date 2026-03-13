import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useCallback } from "react";
import type { Note } from "../../types/note";

interface NoteEditorProps {
  note: Note;
  onSave: (content: string) => void;
}

export function NoteEditor({ note, onSave }: NoteEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Start writing…" }),
    ],
    content: note.content,
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none outline-none min-h-[300px] text-[var(--color-text)]",
      },
    },
  });

  // Sync content when note ID changes (switching notes)
  useEffect(() => {
    if (editor && note.content !== editor.getText()) {
      editor.commands.setContent(note.content);
    }
  }, [note.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBlur = useCallback(() => {
    if (editor) {
      // Get markdown-like text from TipTap
      onSave(editor.getText());
    }
  }, [editor, onSave]);

  return (
    <div
      onBlur={handleBlur}
      className="flex-1 overflow-y-auto px-12 py-6"
    >
      <EditorContent editor={editor} />
    </div>
  );
}
