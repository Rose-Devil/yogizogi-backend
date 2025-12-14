// 인증 서비스
// controller는 req/res만, 서비스는 "정책/로직"만 담당하게 분리
const authRepository = require("./auth.repository");
const { hashPassword, verifyPassword } = require("../../common/utils/password");
const { createJwtToken } = require("../../common/utils/jwt");

// 회원가입
async function signup({ userid, password, name, email, url }) {
  // 1) 중복 체크
  const found = await authRepository.findByUserid(userid);
  if (found) {
    // X_Server와 동일한 409 처리 방식 유지
    return { ok: false, status: 409, body: { message: `${userid}이 이미 있습니다.` } };
  }

  // 2) 비밀번호 해싱
  const passwordHash = hashPassword(password);

  // 3) 유저 생성
  const userId = await authRepository.createUser({
    userid,
    passwordHash,
    name,
    email,
    url,
  });

  // 4) JWT 토큰 생성(로그인 처리까지 같이)
  const token = createJwtToken(userId);

  return { ok: true, status: 201, body: { token, userid } };
}

// 로그인
async function login({ userid, password }) {
  const user = await authRepository.findByUserid(userid);

  // 사용자 없음
  if (!user) {
    return { ok: false, status: 401, body: { message: `${userid}를 찾을 수 없음` } };
  }

  // 비밀번호 불일치
  const isValid = verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { ok: false, status: 401, body: { message: "비밀번호 오류" } };
  }

  // 토큰 생성
  const token = createJwtToken(user.id);

  return { ok: true, status: 200, body: { token, userid } };
}

// 로그인 유지(me)
async function me(userId, token) {
  const user = await authRepository.findById(userId);
  if (!user) {
    return { ok: false, status: 401, body: { message: "사용자를 찾을 수 없음" } };
  }

  // X_Server 컨트롤러 me의 응답 형태를 유지
  return { ok: true, status: 200, body: { token, userid: user.userid } };
}

module.exports = { signup, login, me };
