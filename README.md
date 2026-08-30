# Folio

Skupione notatki markdown. Lista, wyszukiwanie, edycja, podgląd, asystent.

**Codescribe owns speech. Folio is a paste canvas — not a second microphone.**

This is not a port of `vetcoders/codescribe`. The macOS engine on
`dbxms-runtime-claude` @ `519159d` has thrones Folio does not have and must
not fake: `RecordingController`, `AcousticLedger`, `TranscriptReducer`,
Transcript Bus, `DeliveryRoute`. See [docs/CODESCRIBE.md](docs/CODESCRIBE.md).

## What works today

- Sidebar note list, instant search, create/delete
- Markdown source + rendered preview
- Last-edited timestamps, `localStorage` persist
- Keyboard: `N` / `⌘N`, `/` / `⌘K`, `⌘E`, `⌘J`, `⌘D`, `⌘⌫`, `?`
- Optional in-browser dictation (**Web Speech**, labeled as Folio — never Apple L0)
- Optional Grok assist on the open note

## What this is not

- Not Apple live, not Whisper on retained PCM, not an AcousticLedger
- `SpeechRecognition.isFinal` is a hypothesis close, not a ledger seal
- xAI file STT runs only when the live canvas produced nothing (gap-fill)
- The overlay looks related because it is the same lab. The engine chip says
  `web-speech · Folio` on purpose

## Codescribe join (in order)

1. **Paste.** Keep Folio focused as a foreign caret. Codescribe already pastes
   into Notes / Ghostty / Alacritty. Do not open Folio's mic during a take.
2. **Bus observer (not built).** Tail `~/.codescribe/transcript-events.jsonl`
   / `codescribe transcribe live`. Replace the note from complete
   `rendered_text` when `sequence` is newer. Never emit a fake bus.
3. **Web canvas speaking occurrence identity (later).** Same as Swift:
   `applyTranscriptProjection`. No second reducer.

## Run

This snapshot still carries Grok App Builder chrome (`scripts/with-app-env.mjs`,
`server/middleware/grok-pwa.ts`, unused `src/lib/auth`). Product code is
`src/components/notes/*` and `src/lib/{notes-store,markdown,ai,codescribe}`.

```bash
npm install
npm run dev
npm run typecheck
npm run test:folio
```

Dictation and the assistant need `XAI_API_KEY` on the server for gap-fill and
chat. Notes themselves do not.

## License

FSL-1.1-ALv2. Same family as Codescribe. See `LICENSE` and `NOTICE`.
