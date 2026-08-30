/**
 * Whole-word lexicon rewrite — codescribe/core/pipeline/stream_postprocess.rs
 * plus operator_vocabulary.jsonl. Safe to re-run after any LLM pass.
 * Append-only: this only substitutes registered mis-hears, never deletes.
 */

type Rule = { pattern: RegExp; replacement: string };

function word(term: string): RegExp {
  const escaped = term.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+");
  return new RegExp(`(?:^|[^\\p{L}\\p{N}_])(${escaped})(?=[^\\p{L}\\p{N}_]|$)`, "giu");
}

const PAIRS: Array<[string, string]> = [
  ["locktree", "Loctree"],
  ["loktree", "Loctree"],
  ["loctree", "Loctree"],
  ["luxury", "Loctree"],
  ["code scribe", "Codescribe"],
  ["codescribe", "Codescribe"],
  ["vet coders", "Vetcoders"],
  ["vetcoders", "Vetcoders"],
  ["git hub", "GitHub"],
  ["github", "GitHub"],
  ["doker", "Docker"],
  ["markdown", "Markdown"],
  ["aicx", "AICX"],
  ["vibecrafted", "Vibecrafted"],
  ["vibe crafted", "Vibecrafted"],
  // operator_vocabulary.jsonl
  ["schowek", "clipboard"],
  ["schowku", "clipboard"],
  ["schowka", "clipboard"],
  ["schofku", "clipboard"],
  ["schofka", "clipboard"],
  ["schopku", "clipboard"],
  ["schopka", "clipboard"],
  ["klipbord", "clipboard"],
  ["klip bord", "clipboard"],
  ["klipboard", "clipboard"],
  ["zaznaczenie", "selection"],
  ["zaznaczenia", "selection"],
  ["zaznaczeniu", "selection"],
  ["selekszyn", "selection"],
  ["wklej", "paste"],
  ["wkleić", "paste"],
  ["fklej", "paste"],
  ["pejst", "paste"],
  ["skrinszot", "screenshot"],
  ["skrin szot", "screenshot"],
  ["zrzut ekranu", "screenshot"],
  ["zżut ekranu", "screenshot"],
  ["transkrypt", "transcript"],
  ["transkryptu", "transcript"],
  ["transkrypcie", "transcript"],
  ["transkrypcja", "transcript"],
  ["transkript", "transcript"],
  ["frontmołst", "frontmost"],
  ["front most", "frontmost"],
  ["prompta", "prompt"],
  ["promt", "prompt"],
  ["ejdżent", "agent"],
  ["ejdzent", "agent"],
];

const RULES: Rule[] = PAIRS.map(([from, to]) => ({
  pattern: word(from),
  replacement: to,
}));

export const PROTECTED_TERMS = [
  "Loctree",
  "Codescribe",
  "Vetcoders",
  "GitHub",
  "Docker",
  "AICX",
  "Vibecrafted",
  "Markdown",
  "Grok",
  "Folio",
  "clipboard",
  "screenshot",
  "transcript",
];

export function applyLexicon(text: string): string {
  let out = text;
  for (const rule of RULES) {
    out = out.replace(rule.pattern, (full, match: string) => {
      const prefix = full.slice(0, full.length - match.length);
      return prefix + rule.replacement;
    });
  }
  return out;
}

export function protectedTermsLost(before: string, after: string): string[] {
  const lost: string[] = [];
  for (const term of PROTECTED_TERMS) {
    if (word(term).test(before) && !word(term).test(after)) lost.push(term);
  }
  return lost;
}

export function whisperInitialPrompt(extra: string[] = []): string | undefined {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const term of [...PROTECTED_TERMS, ...extra]) {
    const key = term.toLowerCase();
    if (seen.has(key) || !term.trim()) continue;
    seen.add(key);
    terms.push(term);
    if (terms.length >= 24) break;
  }
  if (terms.length === 0) return undefined;
  return `Vocabulary: ${terms.join("; ")}.`;
}
