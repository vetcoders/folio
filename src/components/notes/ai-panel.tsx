import { ArrowUp, ListTodo, Maximize2, Sparkles, Wand2, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { type AssistAction, assistNote } from "@/lib/ai";
import { renderMarkdown } from "@/lib/markdown";
import type { Note } from "@/lib/notes-store";

type Turn = { role: "user" | "assistant"; content: string };

const ACTIONS: Array<{ id: AssistAction; label: string; icon: typeof Wand2 }> = [
  { id: "summarize", label: "Streszczenie", icon: Sparkles },
  { id: "rewrite", label: "Przepisz", icon: Wand2 },
  { id: "expand", label: "Rozwiń", icon: Maximize2 },
  { id: "tasks", label: "Zadania", icon: ListTodo },
  { id: "tidy", label: "Porządek", icon: Wand2 },
];

export function AiPanel({
  note,
  onClose,
  onInsert,
  mobile,
}: {
  note: Note | null;
  onClose: () => void;
  onInsert: (text: string) => void;
  mobile?: boolean;
}) {
  const [history, setHistory] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  async function run(action: AssistAction, question?: string) {
    if (!note || busy) return;
    const q = question?.trim();
    if (action === "chat" && !q) return;
    setBusy(true);
    setError(null);
    if (q) setHistory((h) => [...h, { role: "user", content: q }]);
    try {
      const result = await assistNote({
        data: {
          action,
          note: note.body,
          question: q,
          history: history.slice(-6),
        },
      });
      if (!result.ok) {
        setError(result.error);
      } else {
        setHistory((h) => [...h, { role: "assistant", content: result.text }]);
        requestAnimationFrame(() => {
          listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
        });
      }
    } catch {
      setError("Nie udało się połączyć z asystentem.");
    } finally {
      setBusy(false);
      setDraft("");
    }
  }

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-full flex-col bg-surface",
        mobile ? "" : "border-l border-border",
      )}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-sm font-medium tracking-tight">Asystent</p>
          <p className="text-[11px] text-muted">Grok · bieżąca notatka</p>
        </div>
        <Button variant="ghost" size="iconSm" aria-label="Zamknij asystenta" onClick={onClose}>
          <X />
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5 px-3 pb-3">
        {ACTIONS.map((a) => (
          <Button
            key={a.id}
            variant="solid"
            size="sm"
            disabled={busy || !note}
            onClick={() => run(a.id)}
          >
            <a.icon />
            {a.label}
          </Button>
        ))}
      </div>

      <div ref={listRef} className="ai-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {history.length === 0 && !busy ? (
          <p className="px-1 py-6 text-sm leading-relaxed text-muted">
            Streść, przepisz albo zapytaj o tę notatkę. Odpowiedź możesz wstawić pod spodem.
          </p>
        ) : null}
        {history.map((turn, i) => (
          <div
            key={`${turn.role}-${i}`}
            className={cn(
              "mb-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm leading-relaxed",
              turn.role === "user" ? "bg-surface-2 text-fg" : "bg-bg text-fg",
            )}
          >
            {turn.role === "assistant" ? (
              <>
                <div
                  className="markdown-body text-[15px]"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(turn.content) }}
                />
                <button
                  type="button"
                  className="mt-2 text-[11px] font-medium text-focus hover:underline"
                  onClick={() => onInsert(turn.content)}
                >
                  Wstaw do notatki
                </button>
              </>
            ) : (
              turn.content
            )}
          </div>
        ))}
        {busy ? (
          <p className="px-1 py-2 text-sm text-muted">
            <span className="shimmer">Myśli…</span>
          </p>
        ) : null}
        {error ? <p className="px-1 py-2 text-sm text-danger">{error}</p> : null}
      </div>

      <form
        className="border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void run("chat", draft);
        }}
      >
        <div className="flex items-end gap-2 rounded-[var(--radius-md)] bg-surface-2 p-1.5 shadow-[var(--shadow-border)]">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="Zapytaj o notatkę…"
            aria-label="Pytanie do asystenta"
            className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void run("chat", draft);
              }
            }}
          />
          <Button
            variant="default"
            size="iconSm"
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label="Wyślij"
          >
            <ArrowUp />
          </Button>
        </div>
      </form>
    </aside>
  );
}
