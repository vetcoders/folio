/**
 * Deterministic sentence shaping — Light+ from codescribe/core/pipeline/light_plus.rs.
 * Always-on, zero-network floor under the optional LLM formatter.
 */

const COLLAPSIBLE = new Set([".", "!", "?", ",", ";", ":"]);

function isHesitation(token: string): boolean {
  const core = Array.from(token)
    .filter((c) => /\p{L}/u.test(c))
    .join("")
    .toLowerCase();
  if (core.length < 2) return false;
  const first = core[0];
  if ("yeaiuo".includes(first) && [...core].every((c) => c === first)) return true;
  return ["hm", "hmm", "hmmm", "mhm", "mhmm", "uh", "uhm", "um", "umm"].includes(core);
}

function collapseTokens(text: string): string {
  const kept: string[] = [];
  for (const token of text.split(/\s+/)) {
    if (!token) continue;
    if (isHesitation(token)) continue;
    kept.push(token);
  }
  return kept.join(" ");
}

function tightenPunctuation(text: string): string {
  let out = "";
  let pendingSpace = false;
  let previousPunct: string | null = null;
  for (const ch of text) {
    if (/\s/.test(ch)) {
      pendingSpace = true;
      continue;
    }
    if (COLLAPSIBLE.has(ch)) {
      if (previousPunct === ch) continue;
      out += ch;
      previousPunct = ch;
      pendingSpace = false;
      continue;
    }
    if (pendingSpace && out.length > 0) out += " ";
    pendingSpace = false;
    previousPunct = null;
    out += ch;
  }
  return out;
}

function leftEndsSentence(left: string): boolean {
  const trimmed = left.trimEnd();
  if (!trimmed) return true;
  return /[.!?…]$/.test(trimmed);
}

function capitalizeSpan(text: string, openAtStart: boolean): string {
  let out = "";
  let atStart = openAtStart;
  for (const ch of text) {
    if (atStart && /\p{L}/u.test(ch)) {
      out += ch.toLocaleUpperCase("pl-PL");
      atStart = false;
      continue;
    }
    out += ch;
    if (ch === "." || ch === "!" || ch === "?" || ch === "…") atStart = true;
    else if (!/\s/.test(ch)) atStart = false;
  }
  return out;
}

function shapeParagraph(span: string, leftContext: string): string {
  const trimmed = span.trim();
  if (!trimmed) return "";
  const joined = collapseTokens(trimmed);
  if (!joined) return "";
  const tightened = tightenPunctuation(joined).trim();
  if (!tightened) return "";
  let shaped = capitalizeSpan(tightened, leftEndsSentence(leftContext));
  if (!/[.!?…:]$/.test(shaped)) shaped += ".";
  return shaped;
}

/** Shape a sealed span. Honour left context so progressive seals keep casing. */
export function applyLightPlus(span: string, leftContext = ""): string {
  if (!span.trim()) return "";
  if (!span.includes("\n")) return shapeParagraph(span, leftContext);

  const parts = span.split("\n");
  const out: string[] = [];
  let ctx = leftContext;
  for (const part of parts) {
    if (!part.trim()) {
      out.push("");
      ctx = ctx.endsWith("\n\n") ? ctx : ctx + "\n";
      continue;
    }
    const shaped = shapeParagraph(part, ctx);
    out.push(shaped);
    ctx = shaped;
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
