import assert from "node:assert/strict";
import test from "node:test";
import { validateJobInput } from "../web/src/lib/job-input.ts";

test("job input validation normalizes URLs and rejects unsafe input", () => {
  assert.deepEqual(validateJobInput({ mode: "url", input: "example.com" }), {
    mode: "url",
    input: "https://example.com/",
  });
  assert.deepEqual(
    validateJobInput({ mode: "prompt", input: "  Demo app  " }),
    {
      mode: "prompt",
      input: "Demo app",
    },
  );
  assert.throws(
    () => validateJobInput({ mode: "url", input: "file:///tmp/test" }),
    /Only http\(s\) URLs work/,
  );
  assert.throws(
    () => validateJobInput({ mode: "url", input: "x".repeat(2001) }),
    /URL under 2000 characters/,
  );
});
