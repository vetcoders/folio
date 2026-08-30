# Folio × Codescribe

Pinned: `vetcoders/codescribe` @ **`519159d`** (`dbxms-runtime-claude`).
`main` is ~10 days behind that branch. This file is a truth map, not a pitch.

Founder freeze (2026-08-29, `TRANSCRIPTION_PRODUCT_BOUNDARY.md`): do not tune
Apple / Whisper / Lexicon / L3 while the product shell is still failing around
them. Folio branded as “the codescribe engine” would be that experiment.

## Thrones on HEAD

| Throne | Owner | Folio |
| --- | --- | --- |
| Microphone | `RecordingController` — only in-app mic | Competing `getUserMedia`. Forbidden during a Codescribe take. |
| Capture clock | `StreamingRecorder` mints `capture_epoch` after a successful physical open | None |
| Occurrence | `AcousticLedger` keys `(session, capture_epoch, sample_start, sample_end)` | `cs_${Date.now()}` string |
| Document | `TranscriptReducer` in `PresentationEmitter` | Append hypothesis text into a note body |
| Bus | `TranscriptBus` publishes `codescribe.transcript-evidence.v1` | Must consume, never emit |
| Overlay | Swift `OverlayState.applyTranscriptProjection` | Folio HUD is a local view of Web Speech, not a Bus projection |
| Delivery | `resolve_delivery_route` — intent frozen at start | Insert at caret in the open note |
| Notes in Codescribe | `CodescribeNotes` → `~/.codescribe/notes/YYYY-MM-DD.md`, `ArchiveOnly` | Folio is a different notes product |

Live route on HEAD (not optional):

```
intent → RecordingController → StreamingRecorder
  → apple_stream_transcription_session
      L0 Apple observation
      L1 Whisper on retained PCM of the same occurrence
      L2 Lexicon + Light+ relabel of an authorized occurrence
      L3 Responses formatter, same
      Silero = time/energy evidence, owns no text
  → AcousticLedger::admit / seal
  → TranscriptReducer → Transcript Bus → Swift → DeliveryRoute
```

Conservation law: five spoken “Iwo” on five disjoint PCM ranges stay five.
Equal strings are not identity. Folio has no PCM, so it refuses to collapse
short repetitions and only treats 8+ identical tokens as a decoder loop.

## Honest Folio dictation

What `src/lib/codescribe/session.ts` actually does:

- Web Speech API as a live canvas analog. In Chrome this is often Google
  cloud, never Apple SpeechAnalyzer.
- `MediaRecorder` blob → xAI `/v1/audio/transcriptions` **only if** the live
  canvas produced nothing. That is gap-fill, not L1.
- Lexicon + Light+ as string cosmetics. That is not occurrence-bound L2.
- Overlay engine chip: `web-speech · Folio` or `gap-fill · xAI STT`.

What it must not say (and no longer says):

- `apple-live`
- `codescribe` as the HUD wordmark
- `isFinal` = seal
- cloud STT as stop-time authority over committed text

## Integration paths that preserve HEAD

### 1. Paste ambulance — do this first

Codescribe already pastes into a latched foreign caret. Folio is another
Notes-like target.

- Keep a focused textarea that accepts Cmd+V
- Do not steal focus during a take
- Do not call `getUserMedia` while Codescribe holds the mic
- Optional later: watch `~/.codescribe/notes/YYYY-MM-DD.md` (`ArchiveOnly`)

Codescribe work: none. `refuse_paste_into_self` fires only if Codescribe's
own overlay holds the caret.

### 2. Transcript Bus consumer — the real join

Folio never opens audio. It tails the same file `bus-demux` and
`codescribe transcribe live` already read.

Must accept both schemas:

- `codescribe.transcript.v1` — `session_started` / `session_ended` only.
  Empty text. Absence of `source` means the app; `source=cli_file_verdict`
  is CLI and is not a live take.
- `codescribe.transcript-evidence.v1` — the document. Replace the displayed
  snapshot with complete `rendered_text` when `sequence` /
  `reducer_revision` is newer. Key rows by the occurrence 4-tuple, not by
  label. Incomplete `seal_coverage` is not “recorder failed”.

Browser cannot see `~/.codescribe` from an origin. Honest transports:
local sidecar → SSE, File System Access pick, or follow
`codescribe transcribe live`. Do not invent a second bus path.

### 3. Web canvas speaking occurrence identity — later

One function, `applyTranscriptProjection`. Preview paints a tail and never
writes the note. Waveform, if any, comes from Codescribe receipts — not
from Folio's AnalyserNode.

Do not add `DeliveryIntent::Folio` inside Codescribe unless HEAD grows that
intent frozen at session start.

## Loss if Folio STT is treated as Codescribe

You lose the product. No PCM clock, no occurrence conservation, no Bus, no
agent wake, unlabeled cloud egress under an “apple-live” chip, and a
stop-path whole-file rewrite the Apple lane killed on purpose.

## Quality corpus (takes 01–04)

`docs/corpus/codescribe-quality` is the operator read-aloud set
(`ZADANIA_TESTOWE.txt`). Folio uses the **raw** overlay strings as lexicon
input. A green `corpus.test.ts` means registered mis-hears rewrite to gold
terms (`Log3` → `Loctree`, `Roosta` → `Rust`, `po zgrze SQL` → `PostgreSQL`).
It does not mean Folio ran Whisper, admitted an occurrence, or sealed a take.

The Feb 2026 `v0_7_20-stream.txt` is a Whisper-only baseline. Worse. Kept
as archaeology, not as a target.

