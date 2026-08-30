import assert from "node:assert/strict";
import { test } from "node:test";
import { applyLexicon } from "./lexicon.ts";

test("operator vocab and product names rewrite whole words", () => {
  assert.match(applyLexicon("schowek i loctree"), /clipboard/);
  assert.match(applyLexicon("schowek i loctree"), /Loctree/);
  assert.match(applyLexicon("skrinszot z codescribe"), /screenshot/);
  assert.match(applyLexicon("skrinszot z codescribe"), /Codescribe/);
});

test("does not eat substrings", () => {
  assert.equal(applyLexicon("piwo"), "piwo");
});
