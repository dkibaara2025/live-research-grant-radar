import assert from "node:assert/strict";
import test from "node:test";
import { radarRequestSchema } from "../src/lib/validation";

test("radarRequestSchema returns clear validation issues", () => {
  const parsed = radarRequestSchema.safeParse({
    profile: {
      field: "x",
    },
  });

  assert.equal(parsed.success, false);

  if (!parsed.success) {
    assert.ok(parsed.error.issues.length > 0);
    assert.match(parsed.error.issues[0].message, /at least|required|expected/i);
  }
});
