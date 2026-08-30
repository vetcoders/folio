# `src/lib/codescribe` is not Codescribe

This directory is Folio's **in-browser dictation postprocess**. It copies a
few deterministic text transforms from `vetcoders/codescribe` (lexicon,
Light+ sentence shape, spoken punctuation). It does **not** implement the
engine.

Pinned against `vetcoders/codescribe` @ `519159d` (`dbxms-runtime-claude`).

| Codescribe throne (HEAD) | Folio |
| --- | --- |
| `RecordingController` (one mic) | A competing `getUserMedia`. Do not run while Codescribe.app is taking. |
| `AcousticLedger` occurrence `(session, capture_epoch, sample_start, sample_end)` | `cs_${Date.now()}` string. No PCM clock. |
| L0 Apple live | Web Speech API (often vendor cloud). Never Apple. |
| L1 Whisper on retained PCM | xAI file STT only if live produced nothing. |
| L2 Lexicon + Light+ as occurrence relabel | String cosmetics on a hypothesis. |
| Transcript Bus `transcript-evidence.v1` | Not published. Folio must consume, never emit. |
| `DeliveryRoute` | Insert into the open note. |

`SpeechRecognition.isFinal` is a hypothesis close. It is not a ledger seal.

Join Folio to Codescribe at paste (path 1) or as a Bus observer (path 2).
Never at the microphone. See `docs/CODESCRIBE.md`.
