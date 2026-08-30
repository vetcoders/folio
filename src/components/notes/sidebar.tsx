import { FilePlus, Search, Trash2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { relativeTime } from "@/lib/format-time";
import { extractPreview } from "@/lib/markdown";
import { filteredNotes, noteTitle, type Note, useNotes } from "@/lib/notes-store";

export function Sidebar({
  onRequestDelete,
  searchRef,
  mobile,
  onClose,
}: {
  onRequestDelete: (note: Note) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  mobile?: boolean;
  onClose?: () => void;
}) {
  const notes = useNotes((s) => s.notes);
  const activeId = useNotes((s) => s.activeId);
  const query = useNotes((s) => s.query);
  const setQuery = useNotes((s) => s.setQuery);
  const setActive = useNotes((s) => s.setActive);
  const createNote = useNotes((s) => s.createNote);
  const listRef = useRef<HTMLDivElement>(null);

  const visible = filteredNotes(notes, query);

  useEffect(() => {
    const el = listRef.current?.querySelector('[aria-current="true"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-full flex-col bg-surface",
        mobile ? "" : "border-r border-border",
      )}
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div>
          <p className="font-serif text-xl font-semibold tracking-tight">Folio</p>
          <p className="mt-0.5 text-xs text-muted">{notes.length} notatek</p>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip label="Nowa notatka" keys="⌘N">
            <Button
              variant="solid"
              size="iconSm"
              aria-label="Nowa notatka"
              onClick={() => {
                createNote();
                onClose?.();
              }}
            >
              <FilePlus />
            </Button>
          </Tooltip>
          {mobile ? (
            <Button variant="ghost" size="iconSm" aria-label="Zamknij listę" onClick={onClose}>
              <X />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="px-3 pb-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
          <Input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj"
            aria-label="Szukaj notatek"
            className="pl-9"
          />
        </label>
      </div>

      <div
        ref={listRef}
        role="listbox"
        aria-label="Notatki"
        className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-4"
      >
        {visible.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted">
            {query ? `Nic nie pasuje do „${query}”.` : "Brak notatek."}
          </p>
        ) : (
          visible.map((note) => {
            const active = note.id === activeId;
            return (
              <div
                key={note.id}
                role="option"
                aria-selected={active}
                aria-current={active ? "true" : undefined}
                tabIndex={active ? 0 : -1}
                className={cn(
                  "group relative mb-1 cursor-pointer rounded-[var(--radius-md)] px-3 py-2.5 outline-none",
                  "transition-[background-color] duration-150",
                  active ? "bg-surface-2" : "hover:bg-surface-2/60",
                )}
                onClick={() => {
                  setActive(note.id);
                  onClose?.();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActive(note.id);
                    onClose?.();
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium tracking-tight">
                    {noteTitle(note)}
                  </p>
                  <button
                    type="button"
                    aria-label="Usuń notatkę"
                    className={cn(
                      "relative -mr-1 size-7 shrink-0 rounded-[var(--radius-xs)] text-subtle",
                      "opacity-0 transition-opacity duration-150 hover:text-danger",
                      "group-hover:opacity-100 group-focus-within:opacity-100",
                      "after:absolute after:left-1/2 after:top-1/2 after:size-10 after:-translate-x-1/2 after:-translate-y-1/2",
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestDelete(note);
                    }}
                  >
                    <Trash2 className="mx-auto size-3.5" />
                  </button>
                </div>
                <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted">
                  {extractPreview(note.body)}
                </p>
                <p className="mt-1.5 text-[11px] tabular-nums text-subtle">
                  {relativeTime(note.updatedAt)}
                </p>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
