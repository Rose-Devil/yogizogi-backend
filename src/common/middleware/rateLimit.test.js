const test = require("node:test");
const assert = require("node:assert/strict");

const { rateLimit } = require("./rateLimit");

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(obj) {
      this.body = obj;
      return this;
    },
  };
}

test("rateLimit allows up to max within window", async () => {
  const mw = rateLimit({
    keyPrefix: "t",
    windowMs: 1000,
    max: 2,
    getKey: () => "k",
  });

  const req = { ip: "1.2.3.4" };
  const res1 = createMockRes();
  const res2 = createMockRes();
  const res3 = createMockRes();

  await new Promise((resolve) => mw(req, res1, resolve));
  await new Promise((resolve) => mw(req, res2, resolve));

  let calledNext = false;
  mw(req, res3, () => {
    calledNext = true;
  });

  assert.equal(calledNext, false);
  assert.equal(res3.statusCode, 429);
  assert.equal(res3.body?.success, false);
});

