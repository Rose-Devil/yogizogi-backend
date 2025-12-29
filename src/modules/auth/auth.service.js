// src/modules/auth/auth.service.js
const authRepository = require("./auth.repository");
const { hashPassword, verifyPassword } = require("../../common/utils/password");
const {
  createAccessToken,
  createRefreshToken,
  verifyToken,
} = require("../../common/utils/jwt");

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

  const accessToken = createAccessToken(userId);
  const refreshToken = createRefreshToken(userId);

  return {
    ok: true,
    status: 201,
    body: {
      accessToken,
      user: { id: userId, email, nickname, url: url ?? null },
    },
    refreshToken, // controller에서 쿠키로 심기 위해 별도로 전달
  };
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

// 로그인 유지(me): access로만 유저 정보 반환 (권장: token 응답 X)
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

  if (!user) {
    return {
      ok: false,
      status: 401,
      body: { message: "?ъ슜?먮? 李얠쓣 ???놁쓬" },
    };
  }

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

// refresh: 쿠키 refresh token으로 새 access 발급
async function refresh(refreshToken) {
  if (!refreshToken) {
    return {
      ok: false,
      status: 401,
      body: { message: "Refresh Token이 없습니다." },
    };
  }

  try {
    const decoded = verifyToken(refreshToken);

    if (decoded.typ !== "refresh") {
      return {
        ok: false,
        status: 401,
        body: { message: "Refresh Token이 아닙니다." },
      };
    }

    // (선택 강화) DB에서 user 존재 확인
    const user = await authRepository.findById(decoded.id);
    if (!user) {
      return {
        ok: false,
        status: 401,
        body: { message: "사용자를 찾을 수 없음" },
      };
    }

    const newAccessToken = createAccessToken(decoded.id);

    return {
      ok: true,
      status: 200,
      body: { accessToken: newAccessToken },
    };
  } catch (e) {
    return {
      ok: false,
      status: 401,
      body: { message: "Refresh Token이 유효하지 않습니다." },
    };
  }
}

// 로그아웃: 쿠키 제거(토큰 블랙리스트까지 하려면 별도 구현 필요)
async function logout() {
  return { ok: true, status: 200, body: { message: "logout ok" } };
}

module.exports = { signup, login, me, updateProfileImage, refresh, logout };
