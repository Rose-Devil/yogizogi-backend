const authRepository = require("./auth.repository");
const { hashPassword, verifyPassword } = require("../../common/utils/password");
const {
  createAccessToken,
  createRefreshToken,
  verifyToken,
  createTicketToken,
} = require("../../common/utils/jwt");

const { generate6DigitCode, hashOtp } = require("../../common/utils/otp");
const { sendMail } = require("../../common/utils/mailer");
const { config } = require("../../config/env");

// 공통: OTP 요청(메일 발송 + DB 저장)
async function requestEmailCode({ email, purpose }) {
  const code = generate6DigitCode();
  const secret = config.otp?.secret || process.env.OTP_SECRET;
  const expiresMin = Number(
    config.otp?.expiresMin || process.env.OTP_EXPIRES_MIN || 10
  );

  if (!secret) {
    return {
      ok: false,
      status: 500,
      body: { message: "OTP_SECRET가 필요합니다." },
    };
  }

  const codeHash = hashOtp({ email, purpose, code, secret });
  const expiresAt = new Date(Date.now() + expiresMin * 60 * 1000);

  await authRepository.createEmailOtp({ email, purpose, codeHash, expiresAt });

  await sendMail({
    to: email,
    subject: "[YogiZogi] 이메일 인증 코드",
    text: `인증 코드는 ${code} 입니다. (${expiresMin}분 내 입력)`,
  });

  return {
    ok: true,
    status: 200,
    body: { message: "인증 코드를 전송했습니다." },
  };
}

// 공통: OTP 검증 후 티켓 발급
async function verifyEmailCodeAndIssueTicket({ email, purpose, code, ticketTyp }) {
  const row = await authRepository.findLatestOtp({ email, purpose });
  if (!row) return { ok: false, status: 400, body: { message: "코드를 다시 요청해 주세요." } };

  const maxTries = Number(config.otp?.maxTries || process.env.OTP_MAX_TRIES || 5);
  const secret = config.otp?.secret || process.env.OTP_SECRET;

  if (row.isUsed) return { ok: false, status: 400, body: { message: "이미 사용된 코드입니다." } };
  if (row.tries >= maxTries) return { ok: false, status: 429, body: { message: "시도 횟수 초과. 다시 요청해 주세요." } };
  if (new Date(row.expiresAt).getTime() < Date.now())
    return { ok: false, status: 400, body: { message: "코드가 만료되었습니다." } };

  const expected = hashOtp({ email, purpose, code, secret });
  if (expected !== row.codeHash) {
    await authRepository.bumpOtpTries(row.id);
    return { ok: false, status: 400, body: { message: "인증 코드가 올바르지 않습니다." } };
  }

  await authRepository.markOtpUsed(row.id);

  const ticket = createTicketToken({ email, typ: ticketTyp, ttlSeconds: 15 * 60 });
  return { ok: true, status: 200, body: { ticket } };
}

/** 1) 회원가입 코드 요청 */
async function signupRequestCode(email) {
  const found = await authRepository.findByEmail(email);
  if (found) return { ok: false, status: 409, body: { message: `${email}은(는) 이미 존재합니다.` } };

  return requestEmailCode({ email, purpose: "signup" });
}

/** 2) 회원가입 코드 검증 + signupTicket 발급 */
async function signupVerifyCode({ email, code }) {
  return verifyEmailCodeAndIssueTicket({
    email,
    purpose: "signup",
    code,
    ticketTyp: "signup_ticket",
  });
}

/** 3) 회원가입: signupTicket 검증 후 가입 */
async function signup({ email, password, nickname, url, signupTicket }) {
  if (!signupTicket) {
    return { ok: false, status: 400, body: { message: "이메일 인증이 필요합니다." } };
  }

  try {
    const decoded = verifyToken(signupTicket);
    if (decoded.typ !== "signup_ticket" || decoded.email !== email) {
      return { ok: false, status: 401, body: { message: "인증 티켓이 유효하지 않습니다." } };
    }
  } catch (e) {
    return { ok: false, status: 401, body: { message: "인증 티켓이 만료되었거나 유효하지 않습니다." } };
  }

  const found = await authRepository.findByEmail(email);
  if (found) return { ok: false, status: 409, body: { message: `${email}은(는) 이미 존재합니다.` } };

  const passwordHash = hashPassword(password);
  const userId = await authRepository.createUser({ email, passwordHash, nickname, url });

  const accessToken = createAccessToken(userId);
  const refreshToken = createRefreshToken(userId);

  return {
    ok: true,
    status: 201,
    body: { accessToken, user: { id: userId, email, nickname, url: url ?? null } },
    refreshToken,
  };
}

// 로그인
async function login({ email, password }) {
  const user = await authRepository.findByEmail(email);
  if (!user) return { ok: false, status: 401, body: { message: `${email}을(를) 찾을 수 없습니다.` } };

  const isValid = verifyPassword(password, user.passwordHash);
  if (!isValid) return { ok: false, status: 401, body: { message: "비밀번호 오류" } };

  const accessToken = createAccessToken(user.id);
  const refreshToken = createRefreshToken(user.id);

  return {
    ok: true,
    status: 200,
    body: {
      accessToken,
      user: { id: user.id, email: user.email, nickname: user.nickname, url: user.url ?? null },
    },
    refreshToken,
  };
}

// me
async function me(userId) {
  try {
    const user = await authRepository.findById(userId);
    if (!user) return { ok: false, status: 401, body: { message: "사용자를 찾을 수 없음" } };

    const myTrips = await authRepository.findMyTravelPosts(userId);
    const stats = await authRepository.getMyPostsStats(userId);

    const joinDate = user.created_at ? new Date(user.created_at).toISOString().split("T")[0] : "";

    return {
      ok: true,
      status: 200,
      body: {
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          url: user.url ?? null,
          image: user.url ?? null,
          bio: user.bio ?? null,
          joinDate,
        },
        stats: {
          postCount: parseInt(stats.post_count, 10) || 0,
          totalViews: parseInt(stats.total_views, 10) || 0,
        },
        trips: myTrips.map((trip) => ({
          id: trip.id,
          title: trip.title,
          location: trip.region,
          views: trip.view_count,
          createdAt: trip.created_at,
          thumbnail: trip.thumbnail_url,
        })),
      },
    };
  } catch (error) {
    console.error("me 서비스 에러:", error);
    return { ok: false, status: 500, body: { message: "서버 오류가 발생했습니다." } };
  }
}

async function updateProfileImage(userId, url) {
  await authRepository.updateProfileImageUrl(userId, url);
  const user = await authRepository.findById(userId);
  if (!user) return { ok: false, status: 401, body: { message: "사용자를 찾을 수 없음" } };

  return {
    ok: true,
    status: 200,
    body: {
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        url: user.url ?? null,
        image: user.url ?? null,
      },
    },
  };
}

// refresh
async function refresh(refreshToken) {
  if (!refreshToken) return { ok: false, status: 401, body: { message: "Refresh Token이 없습니다." } };

  try {
    const decoded = verifyToken(refreshToken);
    if (decoded.typ !== "refresh") return { ok: false, status: 401, body: { message: "Refresh Token이 아닙니다." } };

    const user = await authRepository.findById(decoded.id);
    if (!user) return { ok: false, status: 401, body: { message: "사용자를 찾을 수 없음" } };

    const newAccessToken = createAccessToken(decoded.id);
    return { ok: true, status: 200, body: { accessToken: newAccessToken } };
  } catch (e) {
    return { ok: false, status: 401, body: { message: "Refresh Token이 만료되었거나 유효하지 않습니다." } };
  }
}

async function logout() {
  return { ok: true, status: 200, body: { message: "logout ok" } };
}

/** 4) 비밀번호 변경(로그인 필요): 코드 요청 */
async function changePasswordRequestCode(userId) {
  const user = await authRepository.findById(userId);
  if (!user) return { ok: false, status: 401, body: { message: "사용자를 찾을 수 없음" } };

  return requestEmailCode({ email: user.email, purpose: "change_password" });
}

/** 5) 비밀번호 변경(로그인 필요): 코드(+기존 비번) 검증 후 변경 */
async function changePasswordConfirm({ userId, oldPassword, newPassword, code }) {
  const userRow = await authRepository.findById(userId);
  if (!userRow) return { ok: false, status: 401, body: { message: "사용자를 찾을 수 없음" } };

  const user = await authRepository.findByEmail(userRow.email);
  if (!user) return { ok: false, status: 401, body: { message: "사용자를 찾을 수 없음" } };

  if (oldPassword) {
    const okOld = verifyPassword(oldPassword, user.passwordHash);
    if (!okOld) return { ok: false, status: 401, body: { message: "기존 비밀번호가 올바르지 않습니다." } };
  }

  const v = await verifyEmailCodeAndIssueTicket({
    email: user.email,
    purpose: "change_password",
    code,
    ticketTyp: "change_password_ticket",
  });
  if (!v.ok) return v;

  const passwordHash = hashPassword(newPassword);
  await authRepository.updatePasswordHashById(user.id, passwordHash);

  return { ok: true, status: 200, body: { message: "비밀번호가 변경되었습니다." } };
}

module.exports = {
  signupRequestCode,
  signupVerifyCode,
  signup,
  login,
  me,
  updateProfileImage,
  refresh,
  logout,
  changePasswordRequestCode,
  changePasswordConfirm,
};
