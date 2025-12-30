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

// 怨듯넻: OTP ?붿껌(硫붿씪 諛쒖넚 + DB ???
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
      body: { message: "OTP_SECRET???꾩슂?⑸땲??" },
    };
  }

  const codeHash = hashOtp({ email, purpose, code, secret });
  const expiresAt = new Date(Date.now() + expiresMin * 60 * 1000);

  await authRepository.createEmailOtp({ email, purpose, codeHash, expiresAt });

  await sendMail({
    to: email,
    subject: "[YogiZogi] ?대찓???몄쬆 肄붾뱶",
    text: `?몄쬆 肄붾뱶??${code} ?낅땲?? (${expiresMin}遺????낅젰)`,
  });

  return {
    ok: true,
    status: 200,
    body: { message: "?몄쬆 肄붾뱶瑜??꾩넚?덉뒿?덈떎." },
  };
}

// 怨듯넻: OTP 寃利????곗폆 諛쒓툒
async function verifyEmailCodeAndIssueTicket({
  email,
  purpose,
  code,
  ticketTyp,
}) {
  const row = await authRepository.findLatestOtp({ email, purpose });
  if (!row)
    return {
      ok: false,
      status: 400,
      body: { message: "肄붾뱶瑜??ㅼ떆 ?붿껌?댁＜?몄슂." },
    };

  const maxTries = Number(
    config.otp?.maxTries || process.env.OTP_MAX_TRIES || 5
  );
  const secret = config.otp?.secret || process.env.OTP_SECRET;

  if (row.isUsed)
    return {
      ok: false,
      status: 400,
      body: { message: "?대? ?ъ슜??肄붾뱶?낅땲??" },
    };
  if (row.tries >= maxTries)
    return {
      ok: false,
      status: 429,
      body: { message: "?쒕룄 ?잛닔 珥덇낵. ?ㅼ떆 ?붿껌?댁＜?몄슂." },
    };
  if (new Date(row.expiresAt).getTime() < Date.now())
    return {
      ok: false,
      status: 400,
      body: { message: "肄붾뱶媛 留뚮즺?섏뿀?듬땲??" },
    };

  const expected = hashOtp({ email, purpose, code, secret });
  if (expected !== row.codeHash) {
    await authRepository.bumpOtpTries(row.id);
    return {
      ok: false,
      status: 400,
      body: { message: "?몄쬆 肄붾뱶媛 ?щ컮瑜댁? ?딆뒿?덈떎." },
    };
  }

  await authRepository.markOtpUsed(row.id);

  const ticket = createTicketToken({
    email,
    typ: ticketTyp,
    ttlSeconds: 15 * 60,
  });
  return { ok: true, status: 200, body: { ticket } };
}

/** 1) ?뚯썝媛?? 肄붾뱶 ?붿껌 */
async function signupRequestCode(email) {
  const found = await authRepository.findByEmail(email);
  if (found)
    return {
      ok: false,
      status: 409,
      body: { message: `${email}???대? ?덉뒿?덈떎.` },
    };

  return requestEmailCode({ email, purpose: "signup" });
}

/** 2) ?뚯썝媛?? 肄붾뱶 寃利???signupTicket 諛쒓툒 */
async function signupVerifyCode({ email, code }) {
  return verifyEmailCodeAndIssueTicket({
    email,
    purpose: "signup",
    code,
    ticketTyp: "signup_ticket",
  });
}

/** 3) ?뚯썝媛?? signupTicket 寃利???媛??*/
async function signup({ email, password, nickname, url, signupTicket }) {
  if (!signupTicket) {
    return {
      ok: false,
      status: 400,
      body: { message: "?대찓???몄쬆???꾩슂?⑸땲??" },
    };
  }

  try {
    const decoded = verifyToken(signupTicket);
    if (decoded.typ !== "signup_ticket" || decoded.email !== email) {
      return {
        ok: false,
        status: 401,
        body: { message: "?몄쬆 ?곗폆???좏슚?섏? ?딆뒿?덈떎." },
      };
    }
  } catch (e) {
    return {
      ok: false,
      status: 401,
      body: { message: "?몄쬆 ?곗폆??留뚮즺/?좏슚?섏? ?딆뒿?덈떎." },
    };
  }

  const found = await authRepository.findByEmail(email);
  if (found) {
    return {
      ok: false,
      status: 409,
      body: { message: `${email}???대? ?덉뒿?덈떎.` },
    };
  }

  const passwordHash = hashPassword(password);
  const userId = await authRepository.createUser({
    email,
    passwordHash,
    nickname,
    url,
  });

  const accessToken = createAccessToken(userId);
  const refreshToken = createRefreshToken(userId);

  return {
    ok: true,
    status: 201,
    body: {
      accessToken,
      user: { id: userId, email, nickname, url: url ?? null },
    },
    refreshToken,
  };
}

// 濡쒓렇??
async function login({ email, password }) {
  const user = await authRepository.findByEmail(email);
  if (!user)
    return {
      ok: false,
      status: 401,
      body: { message: `${email}瑜?李얠쓣 ???놁쓬` },
    };

  const isValid = verifyPassword(password, user.passwordHash);
  if (!isValid)
    return { ok: false, status: 401, body: { message: "鍮꾨?踰덊샇 ?ㅻ쪟" } };

  const accessToken = createAccessToken(user.id);
  const refreshToken = createRefreshToken(user.id);

  return {
    ok: true,
    status: 200,
    body: {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        url: user.url ?? null,
      },
    },
    refreshToken,
  };
}

// me
async function me(userId) {
  try {
    // 사용자 정보 조회
    const user = await authRepository.findById(userId);
    if (!user) {
      return {
        ok: false,
        status: 401,
        body: { message: "사용자를 찾을 수 없음" },
      };
    }

    // 내 여행기 목록 조회
    const myTrips = await authRepository.findMyTravelPosts(userId);

    // 게시글 통계 조회
    const stats = await authRepository.getMyPostsStats(userId);

    // 가입일 포맷팅 (YYYY-MM-DD)
    const joinDate = user.created_at
      ? new Date(user.created_at).toISOString().split("T")[0]
      : "";

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
          joinDate: joinDate,
        },
        stats: {
          postCount: parseInt(stats.post_count) || 0,
          totalViews: parseInt(stats.total_views) || 0,
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
    return {
      ok: false,
      status: 500,
      body: { message: "서버 오류가 발생했습니다." },
    };
  }
}

async function updateProfileImage(userId, url) {
  await authRepository.updateProfileImageUrl(userId, url);
  const user = await authRepository.findById(userId);
  if (!user)
    return {
      ok: false,
      status: 401,
      body: { message: "?ъ슜?먮? 李얠쓣 ???놁쓬" },
    };

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
  if (!refreshToken)
    return {
      ok: false,
      status: 401,
      body: { message: "Refresh Token???놁뒿?덈떎." },
    };

  try {
    const decoded = verifyToken(refreshToken);
    if (decoded.typ !== "refresh")
      return {
        ok: false,
        status: 401,
        body: { message: "Refresh Token???꾨떃?덈떎." },
      };

    const user = await authRepository.findById(decoded.id);
    if (!user)
      return {
        ok: false,
        status: 401,
        body: { message: "?ъ슜?먮? 李얠쓣 ???놁쓬" },
      };

    const newAccessToken = createAccessToken(decoded.id);
    return { ok: true, status: 200, body: { accessToken: newAccessToken } };
  } catch (e) {
    return {
      ok: false,
      status: 401,
      body: { message: "Refresh Token???좏슚?섏? ?딆뒿?덈떎." },
    };
  }
}

async function logout() {
  return { ok: true, status: 200, body: { message: "logout ok" } };
}

/** 4) 鍮꾨?踰덊샇 蹂寃?濡쒓렇???꾩슂): 肄붾뱶 ?붿껌 */
async function changePasswordRequestCode(userId) {
  const user = await authRepository.findById(userId);
  if (!user)
    return {
      ok: false,
      status: 401,
      body: { message: "?ъ슜?먮? 李얠쓣 ???놁쓬" },
    };

  return requestEmailCode({ email: user.email, purpose: "change_password" });
}

/** 5) 鍮꾨?踰덊샇 蹂寃?濡쒓렇???꾩슂): 肄붾뱶+湲곗〈鍮꾨쾲 寃利???蹂寃?*/
async function changePasswordConfirm({
  userId,
  oldPassword,
  newPassword,
  code,
}) {
  const user = await authRepository.findByEmail(
    (
      await authRepository.findById(userId)
    )?.email
  );
  if (!user)
    return {
      ok: false,
      status: 401,
      body: { message: "?ъ슜?먮? 李얠쓣 ???놁쓬" },
    };
  if (oldPassword) {
    const okOld = verifyPassword(oldPassword, user.passwordHash);
    if (!okOld)
      return {
        ok: false,
        status: 401,
        body: { message: "湲곗〈 鍮꾨?踰덊샇媛 ?щ컮瑜댁? ?딆뒿?덈떎." },
      };
  }

  const v = await verifyEmailCodeAndIssueTicket({
    email: user.email,
    purpose: "change_password",
    code,
    ticketTyp: "change_password_ticket", // ?ш린?쒕뒗 ?곗폆 諛쒓툒留??섍퀬, ?깃났 ?щ?濡??ъ슜
  });
  if (!v.ok) return v;

  const passwordHash = hashPassword(newPassword);
  await authRepository.updatePasswordHashById(user.id, passwordHash);

  return {
    ok: true,
    status: 200,
    body: { message: "鍮꾨?踰덊샇媛 蹂寃쎈릺?덉뒿?덈떎." },
  };
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
