import assert from "node:assert/strict";
import { test } from "node:test";
import { StreamPostProcessor } from "./postprocess.ts";

test("three Iwo survive Light+ and the stream processor", () => {
  const p = new StreamPostProcessor();
  const out = p.process("Iwo Iwo Iwo", { final: true });
  assert.ok(out);
  assert.equal(out.match(/Iwo/g)?.length, 3, out ?? "");
});

test("decoder loop of 8+ identical tokens collapses", () => {
  const p = new StreamPostProcessor();
  const spun = Array.from({ length: 10 }, () => "Wielki").join(" ");
  const out = p.process(spun, { final: true });
  assert.ok(out);
  assert.ok((out.match(/Wielki/g)?.length ?? 99) < 10, out ?? "");
});
