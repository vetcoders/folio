# Codescribe quality corpus (takes 01–04)

Measured Whisper / API / overlay text from the operator quality takes.
Gold is `ZADANIA_TESTOWE.txt` (what was said / read).

Folio does **not** re-transcribe the WAVs. There is no PCM clock here.
This tree is a lexicon fixture: given a raw engine string, `applyLexicon`
must recover the registered product and clinical terms.

WAV files stayed in the drop, not in git (~19 MB). They belong to
Codescribe quality reports, not to a notes canvas.

| Suffix | What it is |
| --- | --- |
| `_api.txt` | file-pass `/v1/audio/transcriptions` (often already lexicon-biased) |
| `_codescribe_raw.txt` | overlay / live raw — the lexicon input |
| `_codescribe_ai_formatted.txt` | L3 formatter on that raw (can invent, can destroy) |
| `*_claude_redacted.txt` | same lane after a later observer repaired terms |
| `_human_transcription_from_wav.txt` | human listen of the WAV, not gold of intent |
| `v0_7_20-stream.txt` | Feb 2026 Whisper-only baseline, worse |

See `src/lib/codescribe/corpus.test.ts`.
