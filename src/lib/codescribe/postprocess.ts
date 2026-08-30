import { applyDictationCommands } from "./dictation.ts";
import { applyLexicon } from "./lexicon.ts";
import { applyLightPlus } from "./light-plus.ts";

const TRAILING_SMILEY = /(?:\s*:+-?d)+(?:\s*:+\s*)*$/i;

function tokenize(text: string): string[] {
  return text
    .split(/\s+/)
    .map((t) => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").toLowerCase())
    .filter(Boolean);
}

function hasRepetitionLoop(text: string): boolean {
  const tokens = tokenize(text);
  if (tokens.length < 6) return false;
  const unique = new Set(tokens);
  return unique.size / tokens.length < 0.45;
}

function removeDecoderLoops(text: string): string {
  // Without a PCM clock we cannot tell "Iwo Iwo Iwo" from a decoder spin.
  // HEAD of codescribe conserves equal words on disjoint spans. Folio only
  // collapses runs of the same token eight or more times — a Whisper-loop
  // signature, not a spoken repetition.
  const tokens = text.split(/(\s+)/);
  const out: string[] = [];
  let lastWord = "";
  let streak = 0;
  for (const token of tokens) {
    if (/^\s+$/.test(token)) {
      out.push(token);
      continue;
    }
    const core = token.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
    if (core && core === lastWord) {
      streak += 1;
      if (streak >= 8) continue;
    } else {
      lastWord = core;
      streak = 1;
    }
    out.push(token);
  }
  return out.join("").replace(/\s+/g, " ").trim();
}

function cleanupArtifacts(text: string): string {
  let out = TRAILING_SMILEY.test(text) ? text.replace(TRAILING_SMILEY, "") : text;
  if (hasRepetitionLoop(out)) out = removeDecoderLoops(out);
  return out;
}

function normalizeWhitespace(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type PostProcessStats = {
  inputChunks: number;
  outputChunks: number;
  droppedChunks: number;
  lexiconRewrites: number;
  repetitionCleanups: number;
};

/**
 * Stream post-processor: lexicon → dictation commands → artifact cleanup →
 * Light+ sentence shape. Partials skip Light+'s trailing period so the overlay
 * does not flicker a stop while the utterance is still open.
 */
export class StreamPostProcessor {
  stats: PostProcessStats = {
    inputChunks: 0,
    outputChunks: 0,
    droppedChunks: 0,
    lexiconRewrites: 0,
    repetitionCleanups: 0,
  };

  process(text: string, opts: { final: boolean; leftContext?: string }): string | null {
    this.stats.inputChunks += 1;
    if (!text.trim()) {
      this.stats.droppedChunks += 1;
      return null;
    }

    let cleaned = applyLexicon(text);
    if (cleaned !== text) this.stats.lexiconRewrites += 1;

    cleaned = applyDictationCommands(cleaned);

    const afterCleanup = cleanupArtifacts(cleaned);
    if (afterCleanup !== cleaned) this.stats.repetitionCleanups += 1;
    cleaned = normalizeWhitespace(afterCleanup);

    if (!cleaned) {
      this.stats.droppedChunks += 1;
      return null;
    }

    if (opts.final) {
      cleaned = applyLightPlus(cleaned, opts.leftContext ?? "");
    }

    if (!cleaned.trim()) {
      this.stats.droppedChunks += 1;
      return null;
    }

    this.stats.outputChunks += 1;
    return cleaned;
  }
}

const ARTIFACT_TOKENS = new Set(["going", "use"]);

function isSuspicious(text: string): boolean {
  if (text.length < 12) return true;
  const tokens = tokenize(text);
  if (tokens.length <= 3) return true;
  const unique = new Set(tokens);
  return unique.size / tokens.length < 0.5 || hasRepetitionLoop(text);
}

/** Reject an LLM final-pass candidate that drifted into filler or noise. */
export function finalPassGuardrailReason(raw: string, candidate: string): string | null {
  if (candidate === raw) return null;
  if (isSuspicious(candidate) && !isSuspicious(raw)) return "candidate_became_suspicious";
  const rawTokens = new Set(tokenize(raw));
  const introduced = new Set<string>();
  for (const token of tokenize(candidate)) {
    if (!rawTokens.has(token) && ARTIFACT_TOKENS.has(token)) introduced.add(token);
  }
  if (introduced.size >= 2) return `artifact_token_drift:${[...introduced].sort().join(",")}`;
  return null;
}
