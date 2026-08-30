# Folio agent contract

Codescribe's AGENTS.md is not this file. Do not copy its runtime laws here
and then violate them.

## Product

Folio is a notes canvas. Codescribe owns speech.

- Do not brand Web Speech as Apple live or as Codescribe.
- Do not open Folio's microphone while Codescribe.app is taking.
- Do not emit `codescribe.transcript-evidence.v1`. Consume it, later.
- Do not collapse short word repetitions; equal strings are not identity.
- Join at paste first, Transcript Bus second, never at the mic.

Pinned engine map: `docs/CODESCRIBE.md` against codescribe `@ 519159d`.

## Verify

```
npm run typecheck
npm run test:folio
```
