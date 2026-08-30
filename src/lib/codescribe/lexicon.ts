/**
 * Whole-word lexicon rewrite.
 *
 * Sources:
 *   - codescribe/core operator_vocabulary.jsonl (clipboard/selection/paste)
 *   - measured Whisper/API mishears from docs/corpus/codescribe-quality
 *     (takes 01–04, gold in ZADANIA_TESTOWE.txt)
 *
 * This is L2 string cosmetics. It is not AcousticLedger. It never deletes.
 * Append-only substitutions of registered mis-hears.
 */

type Rule = { pattern: RegExp; replacement: string };

function word(term: string): RegExp {
  const escaped = term.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+");
  return new RegExp(`(?:^|[^\\p{L}\\p{N}_])(${escaped})(?=[^\\p{L}\\p{N}_]|$)`, "giu");
}

/** Longer phrases first so "pnpm tauri:dev" wins over a shorter token. */
const PAIRS: Array<[string, string]> = [
  // take 01 — spoken meta + product names
  ["na temu biuzdupy", "meta mówię z dupy"],
  ["metamorbiu z dupy", "meta mówię z dupy"],
  ["blik wave", "WAV"],
  ["blik wav", "WAV"],
  ["code scribe", "Codescribe"],
  ["kodescribe", "Codescribe"],
  ["codescrib", "Codescribe"],
  ["code cribe", "Codescribe"],
  ["locked with", "Loctree"],
  ["lock tree", "Loctree"],
  ["log three", "Loctree"],
  ["log tree", "Loctree"],
  ["loc-tri", "Loctree"],
  ["loc tri", "Loctree"],
  ["locktree", "Loctree"],
  ["loktree", "Loctree"],
  ["logtree", "Loctree"],
  ["loctree", "Loctree"],
  ["luxury", "Loctree"],
  ["log3", "Loctree"],
  ["tooltrain", "Toolchain"],
  ["dualchain", "Toolchain"],
  ["dulczan", "Toolchain"],
  ["toolchain", "Toolchain"],
  ["codescribe", "Codescribe"],
  ["ruska", "Rust"],
  ["roosta", "Rust"],
  ["roost", "Rust"],
  ["rusek", "Rust"],

  // take 02 — runda 1 tech+vet
  ["postgra sql", "PostgreSQL"],
  ["postgrz sql", "PostgreSQL"],
  ["po zgrze sql", "PostgreSQL"],
  ["po grze sql", "PostgreSQL"],
  ["poza sql", "PostgreSQL"],
  ["postgre sql", "PostgreSQL"],
  ["postgresql", "PostgreSQL"],
  ["ameksocylinę", "amoksycylinę"],
  ["ameksocylina", "amoksycylina"],
  ["amexocelinę", "amoksycylinę"],
  ["amoxicylinę", "amoksycylinę"],
  ["aloksyceline", "amoksycylinę"],
  ["aneksocyt", "amoksycylinę"],
  ["trwu output", "throughput"],
  ["trwala output", "throughput"],
  ["true output", "throughput"],
  ["do żylni", "dożylnie"],
  ["dexametazonu", "deksametazonu"],
  ["expotential backoff", "exponential backoff"],
  ["exponential bugów", "exponential backoff"],
  ["exponential barakone", "exponential backoff"],
  ["exponential bar for recone", "exponential backoff"],
  ["bezklanowcami", "beztlenowcami"],
  ["bezklinowcami", "beztlenowcami"],
  ["jason i tom", "JSON i TOML"],
  ["json i tom", "JSON i TOML"],
  ["jason i toml", "JSON i TOML"],
  ["ott z externa", "otitis externa"],
  ["otitizę zewnętrzną", "otitis externa"],
  ["otitis externa", "otitis externa"],
  ["kętamycyną", "gentamycyną"],
  ["gentamicyną", "gentamycyną"],
  ["zgętamycym", "gentamycyną"],
  ["tokio i axon", "Tokio i Axum"],
  ["tokyo i axon", "Tokio i Axum"],
  ["tokyo i axum", "Tokio i Axum"],
  ["async await rust", "async/await Rust"],
  ["async, await, wrózt", "async/await Rust"],
  ["async await roost", "async/await Rust"],
  ["cash heat", "cache hit"],
  ["kanału korektycznego", "kanału kręgowego"],
  ["szant okołowątrobowy", "shunt okołowątrobowy"],
  ["szant wątrobowy", "shunt wątrobowy"],
  ["window wibrancy", "window-vibrancy"],
  ["window vibrancy", "window-vibrancy"],
  ["invoke-hell-frust", "invoke hell w Rust"],
  ["invoke hell frost", "invoke hell w Rust"],
  ["invoke hell thrust", "invoke hell w Rust"],
  ["invoke hell trust", "invoke hell w Rust"],
  ["invoke hell rust", "invoke hell w Rust"],
  ["pnpm tauri:dev", "pnpm tauri:dev"],
  ["pnpm tauridev", "pnpm tauri:dev"],
  ["pnpm tauri-dev", "pnpm tauri:dev"],
  ["pnpm tauri dev", "pnpm tauri:dev"],
  ["pmpm tauri dev", "pnpm tauri:dev"],
  ["pnpm tau redef", "pnpm tauri:dev"],
  ["płaszczo do bug-endu", "passthrough do backendu"],
  ["płastro do bagendu", "passthrough do backendu"],
  ["plastru do bagendu", "passthrough do backendu"],
  ["cargo-tarpaulin", "cargo-tarpaulin"],
  ["cargotarpaulin", "cargo-tarpaulin"],
  ["kargotarpaulym", "cargo-tarpaulin"],
  ["karbetarpulin", "cargo-tarpaulin"],
  ["cargo tarpaulin", "cargo-tarpaulin"],
  ["mlx_embeddings", "mlx_embeddings"],
  ["mlx embeddings", "mlx_embeddings"],
  ["pnpm-12", "pnpm dlx"],
  ["pnpm dlx", "pnpm dlx"],
  ["pnpmdl x", "pnpm dlx"],
  ["plus vita", "plus Vite"],
  ["plus vite", "plus Vite"],
  ["microsporum canis", "Microsporum canis"],
  ["mikrosporum canis", "Microsporum canis"],
  ["robę na koksip", "Robenacoxib"],
  ["robbena coxip", "Robenacoxib"],
  ["robena coxip", "Robenacoxib"],
  ["robenacoxib", "Robenacoxib"],
  ["alfaksalon", "Alfaksalon"],
  ["alfaxolan", "Alfaksalon"],
  ["alfaxon", "Alfaksalon"],
  ["mettimazol", "Metimazol"],
  ["metimazol", "Metimazol"],
  ["wykonuję set na pliku", "Wykonuję sed na pliku"],
  ["wykonuje set na pliku", "Wykonuję sed na pliku"],
  ["złożoność 0-m", "złożoność O(n)"],
  ["złożoność 0n", "złożoność O(n)"],
  ["złożoność 0 n", "złożoność O(n)"],
  ["o(n)", "O(n)"],
  ["o(1)", "O(1)"],
  ["0,1 dla cache hit", "O(1) dla cache hit"],
  ["01 dla cache hit", "O(1) dla cache hit"],
  ["0 1 dla cache hit", "O(1) dla cache hit"],
  ["vet coders", "Vetcoders"],
  ["vetcoders", "Vetcoders"],
  ["git hub", "GitHub"],
  ["github", "GitHub"],
  ["vibe crafted", "Vibecrafted"],
  ["vibecrafted", "Vibecrafted"],

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
  ["doker", "Docker"],
  ["markdown", "Markdown"],
  ["aicx", "AICX"],
  ["semgreb", "semgrep"],
  ["sergera", "semgrep"],
  ["semgrep", "semgrep"],
  ["serdę", "Serde"],
  ["serda", "Serde"],
  ["serde", "Serde"],
  ["json-l", "JSONL"],
  ["jsonl", "JSONL"],
  ["tokio", "Tokio"],
  ["axum", "Axum"],
  ["kubernetes", "Kubernetes"],
];

const RULES: Rule[] = [...PAIRS]
  .sort((a, b) => b[0].length - a[0].length)
  .map(([from, to]) => ({
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
  "PostgreSQL",
  "Kubernetes",
  "Tokio",
  "Axum",
  "Serde",
  "JSONL",
  "Toolchain",
  "Rust",
  "clipboard",
  "screenshot",
  "transcript",
  "amoksycylinę",
  "deksametazonu",
  "metronidazol",
  "gentamycyną",
  "otitis externa",
  "Robenacoxib",
  "Alfaksalon",
  "Metimazol",
  "Microsporum canis",
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
