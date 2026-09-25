import assert from "node:assert/strict";
import test from "node:test";
import { parseByteRange } from "../web/src/lib/byte-range.ts";

test("byte range parser supports standard and suffix ranges", () => {
  assert.deepEqual(parseByteRange("bytes=2-5", 10), { start: 2, end: 5 });
  assert.deepEqual(parseByteRange("bytes=7-", 10), { start: 7, end: 9 });
  assert.deepEqual(parseByteRange("bytes=-3", 10), { start: 7, end: 9 });
  assert.deepEqual(parseByteRange("bytes=-20", 10), { start: 0, end: 9 });
});

test("byte range parser rejects malformed and unsatisfiable ranges", () => {
  for (const range of ["bytes=", "bytes=10-", "bytes=8-2", "items=0-1"]) {
    assert.equal(parseByteRange(range, 10), null, range);
  }
});
