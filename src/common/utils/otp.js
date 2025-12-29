const crypto = require("crypto");

function generate6DigitCode() {
  const n = crypto.randomInt(0, 1000000);
  return String(n).padStart(6, "0");
}

// 코드 자체는 DB에 저장하지 않고 hash만 저장
function hashOtp({ email, purpose, code, secret }) {
  return crypto
    .createHash("sha256")
    .update(`${email}|${purpose}|${code}|${secret}`)
    .digest("hex");
}

module.exports = { generate6DigitCode, hashOtp };
