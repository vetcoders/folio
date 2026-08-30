# Folio architecture

Product is a single-route TanStack Start app.

```
sidebar (search + list)
  → editor (markdown source | preview)
  → optional AI panel
  → optional Folio dictation HUD
```

State: Zustand + `localStorage` key `folio.notes.v3`. No accounts, no
Postgres for notes. Server functions exist only for Grok assist and xAI
STT gap-fill.

## Tree that matters

```
src/components/notes/     shell, sidebar, editor, AI, HUD
src/lib/notes-store.ts    notes, search, persist
src/lib/markdown.ts       escaped markdown → HTML
src/lib/ai.ts             assist + format + transcribe
src/lib/codescribe/       in-browser dictation postprocess (NOT the engine)
docs/CODESCRIBE.md        join contract vs HEAD
```

Grok App Builder chrome that this snapshot still contains (not product):

- `src/lib/auth`, `src/lib/app-data`, `src/lib/db.ts`, `src/lib/multiplayer`
- `public/__grok`, `server/middleware/grok-pwa.ts`, `scripts/with-app-env.mjs`
- `AGENTS.md` in a Grok workspace is the sandbox contract, not this product

## Keyboard

| Key | Action |
| --- | --- |
| `N` / `⌘N` | New note |
| `/` / `⌘K` | Focus search |
| `⌘E` | Toggle preview |
| `⌘J` | Toggle assistant |
| `⌘D` | Toggle Folio dictation |
| `⌘⌫` | Delete |
| `?` | Shortcuts |

## Known gaps

- Persist rehydrate vs SSR seed can flash. Key bumps (`v3`) re-seed.
- Dictation is not note-locked if you switch notes mid-take.
- Mobile delete relies on hover. Use the keyboard path or open the row.
- No Transcript Bus consumer yet. Paste is the join.
