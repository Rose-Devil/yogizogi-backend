const crypto = require("crypto");

function sha256Hex(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}

function timingSafeEqualHex(aHex, bHex) {
  if (typeof aHex !== "string" || typeof bHex !== "string") return false;
  if (aHex.length !== bHex.length) return false;
  const a = Buffer.from(aHex, "hex");
  const b = Buffer.from(bHex, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function randomToken({ bytes = 32 } = {}) {
  return crypto.randomBytes(bytes).toString("hex");
}

function randomNumericCode({ digits = 6 } = {}) {
  const max = 10 ** digits;
  const n = crypto.randomInt(0, max);
  return String(n).padStart(digits, "0");
}

module.exports = {
  sha256Hex,
  timingSafeEqualHex,
  randomToken,
  randomNumericCode,
};

