import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { ConfirmDialog, HelpDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  type DictationEngine,
  type DictationSnapshot,
  createDictationEngine,
} from "@/lib/codescribe/session";
import { filteredNotes, noteTitle, type Note, useNotes } from "@/lib/notes-store";
import { AiPanel } from "./ai-panel";
import { DictationHud } from "./dictation-hud";
import { EditorPane } from "./editor-pane";
import { Sidebar } from "./sidebar";

function isField(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return Boolean(el.closest("input, textarea, select, [contenteditable='true']"));
}

function isMod(e: KeyboardEvent): boolean {
  return e.metaKey || e.ctrlKey;
}

function joinInsert(left: string, text: string): string {
  if (!left) return text;
  if (text.startsWith("\n") || /[\s([{]$/.test(left) || /^[.,!?;:)\]]/.test(text)) return text;
  return ` ${text}`;
}

const SHORTCUTS: Array<[string, string]> = [
  ["N / ⌘N", "Nowa notatka"],
  ["⌘K lub /", "Szukaj"],
  ["⌘E", "Podgląd markdown"],
  ["⌘J", "Asystent"],
  ["⌘D", "Dyktowanie"],
  ["⌘⌫", "Usuń notatkę"],
  ["↑ ↓", "Lista notatek (wyszukiwarka)"],
  ["Esc", "Zamknij panel / stop"],
  ["?", "Ten spis"],
];

export function AppShell() {
  const notes = useNotes((s) => s.notes);
  const activeId = useNotes((s) => s.activeId);
  const query = useNotes((s) => s.query);
  const preview = useNotes((s) => s.preview);
  const aiOpen = useNotes((s) => s.aiOpen);
  const helpOpen = useNotes((s) => s.helpOpen);
  const createNote = useNotes((s) => s.createNote);
  const setActive = useNotes((s) => s.setActive);
  const updateBody = useNotes((s) => s.updateBody);
  const deleteNote = useNotes((s) => s.deleteNote);
  const togglePreview = useNotes((s) => s.togglePreview);
  const toggleAi = useNotes((s) => s.toggleAi);
  const setAiOpen = useNotes((s) => s.setAiOpen);
  const setHelpOpen = useNotes((s) => s.setHelpOpen);

  const active = useMemo(
    () => notes.find((n) => n.id === activeId) ?? null,
    [notes, activeId],
  );
  const visible = useMemo(() => filteredNotes(notes, query), [notes, query]);

  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const engineRef = useRef<DictationEngine | null>(null);
  const sessionRange = useRef<{ noteId: string; start: number; end: number } | null>(null);
  const activeRef = useRef<Note | null>(active);
  activeRef.current = active;

  const [pendingDelete, setPendingDelete] = useState<Note | null>(null);
  const [mobileList, setMobileList] = useState(false);
  const [dictation, setDictation] = useState<DictationSnapshot>({
    status: "idle",
    sessionId: null,
    partial: "",
    committed: "",
    error: null,
    errorKind: null,
    elapsedMs: 0,
    level: 0,
    bins: Array.from({ length: 24 }, () => 0.08),
    liveAvailable: false,
    engine: "web-speech",
    sealedCount: 0,
  });

  const writeBody = useCallback(
    (next: string, caret?: number) => {
      const note = activeRef.current;
      if (!note) return;
      updateBody(note.id, next);
      if (caret === undefined) return;
      requestAnimationFrame(() => {
        const el = editorRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(caret, caret);
      });
    },
    [updateBody],
  );

  const onCommit = useCallback(
    (text: string) => {
      const note = activeRef.current;
      if (!note || !text) return;
      const el = editorRef.current;
      const start =
        sessionRange.current?.noteId === note.id
          ? sessionRange.current.end
          : (el?.selectionStart ?? note.body.length);
      const left = note.body.slice(0, start);
      const insert = joinInsert(left, text);
      const next = note.body.slice(0, start) + insert + note.body.slice(start);
      const end = start + insert.length;
      sessionRange.current = {
        noteId: note.id,
        start: sessionRange.current?.noteId === note.id ? sessionRange.current.start : start,
        end,
      };
      writeBody(next, end);
    },
    [writeBody],
  );

  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  useEffect(() => {
    const engine = createDictationEngine({
      onCommit: (text) => onCommitRef.current(text),
    });
    engineRef.current = engine;
    const unsub = engine.subscribe(setDictation);
    return () => {
      engine.cancel();
      unsub();
    };
  }, []);

  const toggleDictation = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const snap = engine.getSnapshot();
    if (snap.status === "listening" || snap.status === "requesting") {
      void engine.stop();
      return;
    }
    if (snap.status === "sealing") return;
    const note = activeRef.current;
    const el = editorRef.current;
    if (note) {
      const pos = el?.selectionStart ?? note.body.length;
      sessionRange.current = { noteId: note.id, start: pos, end: pos };
    }
    void engine.start();
  }, []);

  const requestDelete = useCallback((note?: Note | null) => {
    const target = note ?? activeRef.current;
    if (!target) return;
    setPendingDelete(target);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return;
    deleteNote(pendingDelete.id);
    toast("Notatka usunięta");
    setPendingDelete(null);
  }, [deleteNote, pendingDelete]);

  const insertAi = useCallback(
    (text: string) => {
      const note = activeRef.current;
      if (!note) return;
      const padded = note.body.trim()
        ? `${note.body.replace(/\s+$/, "")}\n\n${text}\n`
        : `${text}\n`;
      writeBody(padded, padded.length);
      toast("Wstawiono odpowiedź asystenta");
    },
    [writeBody],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = isField(e.target);
      const mod = isMod(e);

      if (e.key === "Escape") {
        if (engineRef.current?.getSnapshot().status === "listening") {
          engineRef.current.cancel();
          e.preventDefault();
          return;
        }
        if (helpOpen) {
          setHelpOpen(false);
          e.preventDefault();
          return;
        }
        if (aiOpen) {
          setAiOpen(false);
          e.preventDefault();
          return;
        }
        if (mobileList) {
          setMobileList(false);
          e.preventDefault();
          return;
        }
        if (typing) (e.target as HTMLElement).blur();
        return;
      }

      if (e.key === "?" && !typing && !mod) {
        e.preventDefault();
        setHelpOpen(!helpOpen);
        return;
      }

      if ((e.key === "k" || e.key === "K") && mod) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }

      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if ((e.key === "n" || e.key === "N") && (mod || !typing)) {
        e.preventDefault();
        createNote();
        setMobileList(false);
        requestAnimationFrame(() => editorRef.current?.focus());
        return;
      }

      if ((e.key === "e" || e.key === "E" || e.key === "p" || e.key === "P") && mod) {
        e.preventDefault();
        togglePreview();
        return;
      }

      if ((e.key === "j" || e.key === "J") && mod) {
        e.preventDefault();
        toggleAi();
        return;
      }

      if ((e.key === "d" || e.key === "D") && mod) {
        e.preventDefault();
        toggleDictation();
        return;
      }

      if (e.key === "Backspace" && mod) {
        e.preventDefault();
        requestDelete();
        return;
      }

      if (
        (e.key === "ArrowDown" || e.key === "ArrowUp") &&
        (document.activeElement === searchRef.current || !typing)
      ) {
        if (typing && document.activeElement !== searchRef.current) return;
        e.preventDefault();
        if (visible.length === 0) return;
        const idx = visible.findIndex((n) => n.id === activeId);
        const next =
          e.key === "ArrowDown"
            ? visible[Math.min(visible.length - 1, Math.max(0, idx) + 1)]
            : visible[Math.max(0, (idx < 0 ? 1 : idx) - 1)];
        if (next) setActive(next.id);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    activeId,
    aiOpen,
    createNote,
    helpOpen,
    mobileList,
    requestDelete,
    setAiOpen,
    setHelpOpen,
    setActive,
    toggleAi,
    toggleDictation,
    togglePreview,
    visible,
  ]);

  const dictating =
    dictation.status === "listening" ||
    dictation.status === "requesting" ||
    dictation.status === "sealing";

  return (
    <TooltipProvider>
      <div className="flex h-dvh min-h-0 bg-bg text-fg">
        <div className="hidden h-full w-[280px] shrink-0 md:block">
          <Sidebar searchRef={searchRef} onRequestDelete={requestDelete} />
        </div>

        {mobileList ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-bg/70"
              aria-label="Zamknij listę"
              onClick={() => setMobileList(false)}
            />
            <div className="absolute inset-y-0 left-0 w-[min(92vw,320px)] bg-surface shadow-[var(--shadow-float)]">
              <Sidebar
                mobile
                searchRef={searchRef}
                onRequestDelete={requestDelete}
                onClose={() => setMobileList(false)}
              />
            </div>
          </div>
        ) : null}

        <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col">
          <EditorPane
            note={active}
            preview={preview}
            onTogglePreview={togglePreview}
            onToggleAi={toggleAi}
            onToggleDictation={toggleDictation}
            dictating={dictating}
            onChange={(body) => active && updateBody(active.id, body)}
            editorRef={editorRef}
            onOpenSidebar={() => setMobileList(true)}
          />
          <DictationHud
            snap={dictation}
            onStop={() => void engineRef.current?.stop()}
            onCancel={() => engineRef.current?.cancel()}
          />
        </div>

        {aiOpen ? (
          <>
            <div className="hidden h-full w-[340px] shrink-0 md:block">
              <AiPanel note={active} onClose={() => setAiOpen(false)} onInsert={insertAi} />
            </div>
            <div className="fixed inset-0 z-40 md:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-bg/70"
                aria-label="Zamknij asystenta"
                onClick={() => setAiOpen(false)}
              />
              <div className="absolute inset-x-0 bottom-0 top-16 bg-surface shadow-[var(--shadow-float)]">
                <AiPanel mobile note={active} onClose={() => setAiOpen(false)} onInsert={insertAi} />
              </div>
            </div>
          </>
        ) : null}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Usunąć notatkę?"
        description={
          pendingDelete
            ? `„${noteTitle(pendingDelete)}” zniknie z tej przeglądarki. Tego nie cofniesz.`
            : ""
        }
        confirmLabel="Usuń"
        danger
        onConfirm={confirmDelete}
      />

      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen}>
        <p className="font-serif text-lg font-semibold tracking-tight">Skróty</p>
        <ul className="mt-4 space-y-2">
          {SHORTCUTS.map(([keys, label]) => (
            <li key={keys} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted">{label}</span>
              <kbd className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-fg">
                {keys}
              </kbd>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex justify-end">
          <Button size="sm" variant="solid" onClick={() => setHelpOpen(false)}>
            Zamknij
          </Button>
        </div>
      </HelpDialog>

      <Toaster
        theme="dark"
        position="bottom-center"
        toastOptions={{
          style: {
            background: "var(--color-surface-2)",
            color: "var(--color-fg)",
            border: "1px solid var(--color-border)",
          },
        }}
      />
    </TooltipProvider>
  );
}
