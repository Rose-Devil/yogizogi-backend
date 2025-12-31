const test = require("node:test");
const assert = require("node:assert/strict");

const { sha256Hex, timingSafeEqualHex, randomNumericCode, randomToken } = require("./crypto");

test("sha256Hex returns 64-char hex", () => {
  const h = sha256Hex("hello");
  assert.equal(typeof h, "string");
  assert.equal(h.length, 64);
  assert.match(h, /^[0-9a-f]{64}$/);
});

test("timingSafeEqualHex matches equal hex only", () => {
  const a = sha256Hex("a");
  const b = sha256Hex("a");
  const c = sha256Hex("b");
  assert.equal(timingSafeEqualHex(a, b), true);
  assert.equal(timingSafeEqualHex(a, c), false);
  assert.equal(timingSafeEqualHex(a, "nothex"), false);
});

test("randomNumericCode generates 6 digits", () => {
  const code = randomNumericCode({ digits: 6 });
  assert.match(code, /^[0-9]{6}$/);
});

test("randomToken generates hex", () => {
  const t = randomToken({ bytes: 16 });
  assert.match(t, /^[0-9a-f]{32}$/);
});

