import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Image from "@tiptap/extension-image";
import { common, createLowlight } from "lowlight";
import { Markdown } from "tiptap-markdown";
import { convertFileSrc } from "@tauri-apps/api/core";
import { WikiLinkExtension } from "./WikiLink";
import {
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useState,
  useRef,
} from "react";
import type { Note } from "../../types/note";
import { tauriCommands } from "../../lib/tauri-commands";
import { useNoteStore } from "../../store/notes";

const lowlight = createLowlight(common);

interface SuggestionPopup {
  items: Note[];
  selectedIndex: number;
  rect: DOMRect;
  command: (props: { label: string }) => void;
}

export interface NoteEditorHandle {
  focus: () => void;
}

interface NoteEditorProps {
  note: Note;
  onSave: (content: string) => void;
  locked?: boolean;
}

export const NoteEditor = forwardRef<NoteEditorHandle, NoteEditorProps>(
  ({ note, onSave, locked = false }, ref) => {
    const { vaultPath, notes } = useNoteStore();
    const [popup, setPopup] = useState<SuggestionPopup | null>(null);

    // Refs prevent stale closures inside the TipTap extension config
    const notesRef = useRef(notes);
    notesRef.current = notes;
    const noteIdRef = useRef(note.id);
    noteIdRef.current = note.id;
    const popupRef = useRef(popup);
    popupRef.current = popup;
    const setPopupRef = useRef(setPopup);
    setPopupRef.current = setPopup;

    const editor = useEditor({
      extensions: [
        StarterKit.configure({ codeBlock: false }),
        Placeholder.configure({ placeholder: "Start writing…" }),
        Highlight.configure({ multicolor: false }),
        CodeBlockLowlight.configure({ lowlight }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Image.configure({ inline: false, allowBase64: false }),
        WikiLinkExtension.configure({
          suggestion: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            items: ({ query }: any) =>
              notesRef.current
                .filter(
                  (n) =>
                    n.id !== noteIdRef.current &&
                    n.frontmatter.title.toLowerCase().includes(query.toLowerCase())
                )
                .slice(0, 8),
            render: () => ({
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onStart(props: any) {
                const rect = props.clientRect?.();
                if (!rect) return;
                setPopupRef.current({ items: props.items, selectedIndex: 0, rect, command: props.command });
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onUpdate(props: any) {
                const rect = props.clientRect?.();
                setPopupRef.current((prev) =>
                  prev ? { ...prev, items: props.items, rect: rect ?? prev.rect, command: props.command } : null
                );
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onKeyDown({ event }: any) {
                const curr = popupRef.current;
                if (!curr || curr.items.length === 0) return false;
                if (event.key === "Escape") { setPopupRef.current(null); return true; }
                if (event.key === "ArrowDown") {
                  setPopupRef.current({ ...curr, selectedIndex: (curr.selectedIndex + 1) % curr.items.length });
                  return true;
                }
                if (event.key === "ArrowUp") {
                  setPopupRef.current({ ...curr, selectedIndex: (curr.selectedIndex - 1 + curr.items.length) % curr.items.length });
                  return true;
                }
                if (event.key === "Enter") {
                  const n = curr.items[curr.selectedIndex];
                  if (n) curr.command({ label: n.frontmatter.title });
                  setPopupRef.current(null);
                  return true;
                }
                return false;
              },
              onExit() { setPopupRef.current(null); },
            }),
          },
        }),
        Markdown.configure({
          html: false,
          transformPastedText: true,
          transformCopiedText: true,
        }),
      ],
      content: note.content,
      editorProps: {
        attributes: {
          class: "prose outline-none min-h-[300px] text-[var(--color-text)]",
          style: [
            "font-size: var(--editor-font-size)",
            "line-height: var(--editor-line-height)",
            "max-width: var(--editor-max-width)",
          ].join("; "),
        },
        handlePaste(view, event) {
          const items = event.clipboardData?.items;

          // Handle image paste
          if (items && vaultPath) {
            for (const item of Array.from(items)) {
              if (!item.type.startsWith("image/")) continue;
              event.preventDefault();
              const file = item.getAsFile();
              if (!file) continue;
              const ext = item.type.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
              const filename = `${Date.now()}.${ext}`;
              file.arrayBuffer().then(async (buf) => {
                const data = Array.from(new Uint8Array(buf));
                try {
                  const absPath = await tauriCommands.writeAsset(vaultPath, filename, data);
                  const src = convertFileSrc(absPath);
                  view.dispatch(
                    view.state.tr.replaceSelectionWith(
                      view.state.schema.nodes.image.create({ src, alt: filename })
                    )
                  );
                } catch (e) {
                  console.error("Failed to save image:", e);
                }
              });
              return true;
            }
          }

          // Force tiptap-markdown's clipboardTextParser to handle plain text,
          // bypassing ProseMirror's default which would prefer text/html
          const text = event.clipboardData?.getData("text/plain");
          if (text) {
            event.preventDefault();
            let handled = false;
            view.someProp("clipboardTextParser", (f) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const slice = (f as any)(text, view.state.$from, false, view);
              if (slice) {
                view.dispatch(view.state.tr.replaceSelection(slice));
                handled = true;
              }
              return !!slice;
            });
            if (!handled) {
              view.dispatch(view.state.tr.insertText(text));
            }
            return true;
          }

          return false;
        },
      },
    });

    useImperativeHandle(ref, () => ({
      focus: () => editor?.commands.focus("end"),
    }), [editor]);

    useEffect(() => {
      if (editor) editor.commands.setContent(note.content);
    }, [note.id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
      if (editor) editor.setEditable(!locked);
    }, [editor, locked]);

    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const triggerSave = useCallback(() => {
      if (!editor) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const md = (editor.storage as any).markdown?.getMarkdown?.() ?? editor.getText();
      onSave(md);
    }, [editor, onSave]);

    // Auto-save 1s after the user stops typing
    useEffect(() => {
      if (!editor) return;
      const handler = () => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(triggerSave, 1000);
      };
      editor.on("update", handler);
      return () => {
        editor.off("update", handler);
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      };
    }, [editor, triggerSave]);

    const handleBlur = useCallback(() => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      triggerSave();
    }, [triggerSave]);

    return (
      <div onBlur={locked ? undefined : handleBlur} className={`relative flex-1 overflow-y-auto px-12 py-6 ${locked ? "opacity-75 cursor-not-allowed select-none" : ""}`}>
        <EditorContent editor={editor} />

        {/* Wiki-link suggestion popup */}
        {popup && popup.items.length > 0 && (
          <div
            className="fixed z-50 min-w-[220px] overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl"
            style={{ top: popup.rect.bottom + 6, left: popup.rect.left }}
          >
            {popup.items.map((n, i) => (
              <button
                key={n.id}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                  i === popup.selectedIndex
                    ? "bg-[var(--color-accent)] text-white"
                    : "text-[var(--color-text)] hover:bg-[var(--color-border)]/50"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault(); // keep editor focus
                  popup.command({ label: n.frontmatter.title });
                  setPopup(null);
                }}
              >
                <span className="truncate">{n.frontmatter.title || "Untitled"}</span>
                {n.frontmatter.tags.length > 0 && (
                  <span className="ml-auto shrink-0 text-xs opacity-50">
                    {n.frontmatter.tags[0]}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);
