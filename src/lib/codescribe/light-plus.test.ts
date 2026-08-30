import assert from "node:assert/strict";
import { test } from "node:test";
import { applyLightPlus } from "./light-plus.ts";

test("five spoken Iwo stay five — no string-equality collapse", () => {
  const out = applyLightPlus("Iwo Iwo Iwo Iwo Iwo");
  const count = out.match(/Iwo/g)?.length ?? 0;
  assert.equal(count, 5, out);
});

test("hesitations drop, content stays", () => {
  const out = applyLightPlus("hmm to działa um");
  assert.match(out, /To działa/i);
  assert.doesNotMatch(out, /\bhmm\b/i);
});
