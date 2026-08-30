/**
 * Spoken punctuation / structure commands, in the codescribe operator-vocab
 * spirit. Applied before Light+ so "nowy akapit" becomes a real paragraph.
 * English single words like "period" are skipped — they are content.
 */

type Command = { pattern: RegExp; replacement: string };

const COMMANDS: Command[] = [
  { pattern: /\bnowy akapit\b/giu, replacement: "\n\n" },
  { pattern: /\bnew paragraph\b/giu, replacement: "\n\n" },
  { pattern: /\bnowa linia\b/giu, replacement: "\n" },
  { pattern: /\bnew line\b/giu, replacement: "\n" },
  { pattern: /\bznak zapytania\b/giu, replacement: "?" },
  { pattern: /\bpytajnik\b/giu, replacement: "?" },
  { pattern: /\bwykrzyknik\b/giu, replacement: "!" },
  { pattern: /\bdwukropek\b/giu, replacement: ":" },
  { pattern: /\bśrednik\b/giu, replacement: ";" },
  { pattern: /\bmyślnik\b/giu, replacement: " — " },
  { pattern: /\botwórz nawias\b/giu, replacement: " (" },
  { pattern: /\bzamknij nawias\b/giu, replacement: ") " },
  { pattern: /\bkropka\b/giu, replacement: "." },
  { pattern: /\bprzecinek\b/giu, replacement: "," },
];

export function applyDictationCommands(text: string): string {
  let out = text;
  for (const cmd of COMMANDS) {
    out = out.replace(cmd.pattern, cmd.replacement);
  }
  return out.replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n");
}

export const DICTATION_HELP = [
  ["nowy akapit", "nowy akapit"],
  ["nowa linia", "nowa linia"],
  ["kropka", "."],
  ["przecinek", ","],
  ["pytajnik", "?"],
  ["wykrzyknik", "!"],
  ["dwukropek", ":"],
  ["myślnik", "—"],
];
