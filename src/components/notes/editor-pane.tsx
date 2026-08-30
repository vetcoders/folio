import { Eye, EyeOff, Mic, PanelRight, Pencil } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { relativeTime } from "@/lib/format-time";
import { renderMarkdown } from "@/lib/markdown";
import { noteTitle, type Note } from "@/lib/notes-store";

export function EditorPane({
  note,
  preview,
  onTogglePreview,
  onToggleAi,
  onToggleDictation,
  dictating,
  onChange,
  editorRef,
  onOpenSidebar,
}: {
  note: Note | null;
  preview: boolean;
  onTogglePreview: () => void;
  onToggleAi: () => void;
  onToggleDictation: () => void;
  dictating: boolean;
  onChange: (body: string) => void;
  editorRef: React.RefObject<HTMLTextAreaElement | null>;
  onOpenSidebar?: () => void;
}) {
  const html = note ? renderMarkdown(note.body) : "";
  const title = note ? noteTitle(note) : "";
  const localRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = editorRef.current ?? localRef.current;
    if (!el || preview) return;
    // Keep caret if this is the same note and user is typing.
  }, [note?.id, preview, editorRef]);

  if (!note) {
    return (
      <section className="flex h-full flex-col items-center justify-center bg-bg px-6 text-center">
        <p className="font-serif text-2xl tracking-tight">Pusta teczka</p>
        <p className="mt-2 max-w-sm text-sm text-muted">
          Naciśnij <kbd className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">N</kbd>{" "}
          albo stwórz notatkę z listy.
        </p>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col bg-bg">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2 md:px-5">
        {onOpenSidebar ? (
          <Button variant="ghost" size="sm" className="md:hidden" onClick={onOpenSidebar}>
            Lista
          </Button>
        ) : null}
        <h1 className="min-w-0 flex-1 truncate font-serif text-base font-semibold tracking-tight md:text-lg">
          {title}
        </h1>
        <Tooltip label={preview ? "Edycja" : "Podgląd"} keys="⌘E">
          <Button
            variant={preview ? "solid" : "ghost"}
            size="iconSm"
            aria-pressed={preview}
            aria-label={preview ? "Przełącz na edycję" : "Przełącz na podgląd"}
            onClick={onTogglePreview}
          >
            {preview ? <Pencil /> : <Eye />}
          </Button>
        </Tooltip>
        <Tooltip label={dictating ? "Stop dyktowania" : "Dyktowanie"} keys="⌘D">
          <Button
            variant={dictating ? "solid" : "ghost"}
            size="iconSm"
            aria-pressed={dictating}
            aria-label="Dyktowanie"
            onClick={onToggleDictation}
            className={dictating ? "text-live" : undefined}
          >
            <Mic />
          </Button>
        </Tooltip>
        <Tooltip label="Asystent" keys="⌘J">
          <Button variant="ghost" size="iconSm" aria-label="Asystent" onClick={onToggleAi}>
            <PanelRight />
          </Button>
        </Tooltip>
      </header>

      <div className="editor-scroll min-h-0 flex-1 overflow-y-auto">
        {preview ? (
          <article
            className="markdown-body mx-auto w-full max-w-[42rem] px-5 py-8 md:px-8"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <textarea
            ref={(node) => {
              localRef.current = node;
              (editorRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
            }}
            value={note.body}
            onChange={(e) => onChange(e.target.value)}
            spellCheck
            aria-label="Treść notatki"
            placeholder="# Tytuł"
            rows={28}
            className={cn(
              "note-editor block h-full min-h-[24rem] w-full resize-none bg-transparent px-5 py-8 text-fg outline-none md:px-8",
              "mx-auto max-w-[42rem]",
            )}
          />
        )}
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-border px-4 py-2 text-[11px] text-subtle">
        <span className="tabular-nums">
          Ostatnia edycja {relativeTime(note.updatedAt)}
        </span>
        <span className="hidden sm:inline">
          {preview ? (
            <span className="inline-flex items-center gap-1">
              <EyeOff className="size-3" /> podgląd
            </span>
          ) : (
            "Markdown · zapis automatyczny"
          )}
        </span>
      </footer>
    </section>
  );
}
