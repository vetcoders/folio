import { create } from "zustand";
import { persist } from "zustand/middleware";
import { extractTitle } from "./markdown";

export type Note = {
  id: string;
  body: string;
  createdAt: number;
  updatedAt: number;
};

type NotesState = {
  notes: Note[];
  activeId: string | null;
  query: string;
  preview: boolean;
  aiOpen: boolean;
  helpOpen: boolean;
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  setQuery: (q: string) => void;
  setPreview: (v: boolean) => void;
  togglePreview: () => void;
  setAiOpen: (v: boolean) => void;
  toggleAi: () => void;
  setHelpOpen: (v: boolean) => void;
  setActive: (id: string) => void;
  createNote: (body?: string) => string;
  updateBody: (id: string, body: string) => void;
  deleteNote: (id: string) => void;
};

const NOW = Date.UTC(2026, 7, 30, 4, 48, 0);

const SEED: Note[] = [
  {
    id: "welcome",
    createdAt: NOW - 1000 * 60 * 40,
    updatedAt: NOW - 1000 * 60 * 12,
    body: `# Folio

Notatki, które nie rozpraszają. Lista po lewej, markdown po prawej, zapis od razu w tej przeglądarce.

## Szybki start

- **N** albo **⌘N** — nowa notatka
- **/** albo **⌘K** — szukaj
- **⌘E** — podgląd markdown
- **⌘J** — asystent
- **⌘D** — dyktowanie w przeglądarce (Web Speech — nie Codescribe)
- **⌘⌫** — usuń
- **?** — skróty

Pisz. Reszta ma nie przeszkadzać.
`,
  },
  {
    id: "dictation",
    createdAt: NOW - 1000 * 60 * 90,
    updatedAt: NOW - 1000 * 60 * 25,
    body: `# Dyktowanie

Folio ma własny mikrofon w przeglądarce. To **nie** jest silnik Codescribe.

Codescribe (macOS, branch \`dbxms-runtime-claude\`) ma osobne trony: jeden mikrofon, AcousticLedger, Transcript Bus, DeliveryRoute. Folio jest celem wklejenia i kiedyś obserwatorem Busa. Nie drugim recorderem.

## W tej przeglądarce

1. **⌘D** — Web Speech (często chmura przeglądarki, nigdy Apple L0).
2. Ogon żyje w overlayu. Domknięta hipoteza wpada do notatki. \`isFinal\` ≠ ledger seal.
3. Cloud STT rusza tylko gdy live nic nie dał. To gap-fill, nie Layer 1 na retained PCM.

## Komendy (kosmetyka tekstu)

- **nowy akapit** / **nowa linia**
- **kropka** / **przecinek** / **pytajnik**

„Iwo Iwo Iwo” zostaje trzy razy. Leksykon łapie Loctree / clipboard — to nie jest L2 z PCM.

Jeśli leci take w Codescribe.app: nie otwieraj mikrofonu tutaj. Wklej.
`,
  },
  {
    id: "markdown",
    createdAt: NOW - 1000 * 60 * 180,
    updatedAt: NOW - 1000 * 60 * 50,
    body: `# Markdown

# Nagłówek 1
## Nagłówek 2
### Nagłówek 3

Akapit z **pogrubieniem**, *kursywą*, \`kodem\` i [linkiem](https://x.ai).

- lista
- druga pozycja
  - zagnieżdżenie

1. numerowana
2. kolejna

- [ ] zadanie
- [x] zrobione

> Cytat, który nie krzyczy.

\`\`\`
fn main() {
    println!("folio");
}
\`\`\`

---

Pisz w źródle. Podgląd włączasz **⌘E**.
`,
  },
];

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function noteTitle(note: Note): string {
  return extractTitle(note.body);
}

export const useNotes = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: SEED,
      activeId: SEED[0].id,
      query: "",
      preview: false,
      aiOpen: false,
      helpOpen: false,
      hydrated: true,
      setHydrated: (v) => set({ hydrated: v }),
      setQuery: (query) => set({ query }),
      setPreview: (preview) => set({ preview }),
      togglePreview: () => set({ preview: !get().preview }),
      setAiOpen: (aiOpen) => set({ aiOpen }),
      toggleAi: () => set({ aiOpen: !get().aiOpen }),
      setHelpOpen: (helpOpen) => set({ helpOpen }),
      setActive: (id) => set({ activeId: id, query: get().query }),
      createNote: (body) => {
        const id = uid();
        const now = Date.now();
        const note: Note = {
          id,
          body: body ?? "# \n\n",
          createdAt: now,
          updatedAt: now,
        };
        set({ notes: [note, ...get().notes], activeId: id, preview: false, query: "" });
        return id;
      },
      updateBody: (id, body) => {
        set({
          notes: get().notes.map((n) =>
            n.id === id ? { ...n, body, updatedAt: Date.now() } : n,
          ),
        });
      },
      deleteNote: (id) => {
        const remaining = get().notes.filter((n) => n.id !== id);
        const activeId =
          get().activeId === id ? (remaining[0]?.id ?? null) : get().activeId;
        set({ notes: remaining, activeId });
      },
    }),
    {
      name: "folio.notes.v3",
      partialize: (s) => ({
        notes: s.notes,
        activeId: s.activeId,
        preview: s.preview,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

export function filteredNotes(notes: Note[], query: string): Note[] {
  const q = query.trim().toLowerCase();
  const list = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
  if (!q) return list;
  return list.filter((n) => n.body.toLowerCase().includes(q));
}
