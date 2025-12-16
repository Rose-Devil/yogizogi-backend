const authRepository = require("./auth.repository");
const { hashPassword, verifyPassword } = require("../../common/utils/password");
const { createJwtToken } = require("../../common/utils/jwt");

// 회원가입
async function signup({ email, password, nickname, url }) {
  const found = await authRepository.findByEmail(email);
  if (found) {
    return {
      ok: false,
      status: 409,
      body: { message: `${email}이 이미 있습니다.` },
    };
  }

  const passwordHash = hashPassword(password);

  const userId = await authRepository.createUser({
    email,
    passwordHash,
    nickname,
    url,
  });

  const token = createJwtToken(userId);
  return { ok: true, status: 201, body: { token, email } };
}

// 로그인
async function login({ email, password }) {
  const user = await authRepository.findByEmail(email);

  if (!user) {
    return {
      ok: false,
      status: 401,
      body: { message: `${email}를 찾을 수 없음` },
    };
  }

  const isValid = verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { ok: false, status: 401, body: { message: "비밀번호 오류" } };
  }

  const token = createJwtToken(user.id);
  return { ok: true, status: 200, body: { token, email } };
}

// 로그인 유지(me)
async function me(userId, token) {
  const user = await authRepository.findById(userId);
  if (!user) {
    return {
      ok: false,
      status: 401,
      body: { message: "사용자를 찾을 수 없음" },
    };
  }

  return { ok: true, status: 200, body: { token, email: user.email } };
}

module.exports = { signup, login, me };
