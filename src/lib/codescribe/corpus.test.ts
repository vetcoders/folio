import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { applyLexicon } from "./lexicon.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../docs/corpus/codescribe-quality");

function load(name: string): string {
  return readFileSync(join(root, name), "utf8");
}

function has(hay: string, needle: string): boolean {
  return hay.toLowerCase().includes(needle.toLowerCase());
}

test("take 01 raw: Log3 / Ruska / blik WAV become product terms", () => {
  const out = applyLexicon(load("01_no-to-dobra_codescribe_raw.txt"));
  assert.ok(has(out, "Loctree"), out);
  assert.ok(has(out, "Rust"), out);
  assert.ok(!has(out, "Log3"), out);
  assert.ok(!has(out, "Ruska"), out);
  assert.ok(!has(out, "Roosta"), out);
  assert.ok(has(out, "WAV"), out);
  assert.ok(has(out, "meta mówię z dupy"), out);
});

test("take 02 raw: PostgreSQL, amoksycylina, otitis, Serde", () => {
  const out = applyLexicon(load("02_kubernetes-wymaga-konfiguracji_codescribe_raw.txt"));
  assert.ok(has(out, "PostgreSQL"), out);
  assert.ok(has(out, "amoksycylinę"), out);
  assert.ok(has(out, "dożylnie"), out);
  assert.ok(has(out, "exponential backoff"), out);
  assert.ok(has(out, "beztlenowcami"), out);
  assert.ok(has(out, "Serde"), out);
  assert.ok(has(out, "JSON i TOML"), out);
  assert.ok(has(out, "otitis externa"), out);
  assert.ok(has(out, "gentamycyną"), out);
  assert.ok(has(out, "Tokio"), out);
  assert.ok(has(out, "async/await Rust"), out);
});

test("take 03 raw: O(n), loctree, cargo-tarpaulin, shunt", () => {
  const out = applyLexicon(load("03_algorytm-ma-zlozonosc_codescribe_raw.txt"));
  assert.ok(has(out, "O(n)"), out);
  assert.ok(has(out, "O(1)"), out);
  assert.ok(has(out, "cache hit"), out);
  assert.ok(has(out, "passthrough do backendu"), out);
  assert.ok(has(out, "semgrep"), out);
  assert.ok(has(out, "cargo-tarpaulin"), out);
  assert.ok(has(out, "kanału kręgowego"), out);
  assert.ok(has(out, "Loctree"), out);
  assert.ok(has(out, "shunt wątrobowy"), out);
  assert.ok(has(out, "window-vibrancy"), out);
  assert.ok(has(out, "JSONL"), out);
});

test("take 04 raw: Robenacoxib, Alfaksalon, Microsporum, pnpm", () => {
  const out = applyLexicon(load("04_runda-3-czyli_codescribe_raw.txt"));
  assert.ok(has(out, "Alfaksalon"), out);
  assert.ok(has(out, "mlx_embeddings"), out);
  assert.ok(has(out, "Microsporum canis"), out);
  assert.ok(has(out, "pnpm tauri:dev"), out);
  assert.ok(has(out, "Vite"), out);
  assert.ok(has(out, "Metimazol"), out);
  assert.ok(has(out, "Robenacoxib"), out);
  assert.ok(has(out, "exponential backoff"), out);
  assert.ok(has(out, "Loctree"), out);
  assert.ok(has(out, "Codescribe"), out);
});

test("lexicon does not eat unrelated short words", () => {
  assert.equal(applyLexicon("Tom kupił piwo"), "Tom kupił piwo");
});
