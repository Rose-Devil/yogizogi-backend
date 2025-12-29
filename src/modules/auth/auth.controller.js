// src/modules/auth/auth.controller.js
const authService = require("./auth.service");
const fs = require("fs").promises;

// refresh 쿠키 옵션(3일)
const REFRESH_COOKIE_NAME = "refresh_token";
const refreshCookieOptions = {
  httpOnly: true,
  sameSite: "lax", // 로컬/동일사이트 개발에 무난
  secure: false, // https 배포면 true로
  maxAge: 1000 * 60 * 60 * 24 * 3, // 3일
  path: "/",
};

async function signup(req, res, next) {
  try {
    const { email, password, nickname, url } = req.body;
    const result = await authService.signup({ email, password, nickname, url });

    if (!result.ok) return res.status(result.status).json(result.body);

    // refresh를 HttpOnly 쿠키로 심기
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions);
    return res.status(result.status).json(result.body);
  } catch (e) {
    next(e);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });

    if (!result.ok) return res.status(result.status).json(result.body);

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions);
    return res.status(result.status).json(result.body);
  } catch (e) {
    next(e);
  }
}

async function me(req, res, next) {
  console.log("auth.controller.js의 me 실행");
  try {
    const result = await authService.me(req.id);
    console.log("me 결과:", result);
    return res.status(result.status).json(result.body);
  } catch (e) {
    next(e);
  }
}

async function updateProfileImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "이미지 파일이 필요합니다." });
    }

    // S3 location 사용
    const imageUrl = req.file.location;
    const result = await authService.updateProfileImage(req.id, imageUrl);
    return res.status(result.status).json(result.body);
  } catch (e) {
    next(e);
  }
}

// Silent Refresh용
async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    const result = await authService.refresh(refreshToken);

    return res.status(result.status).json(result.body);
  } catch (e) {
    next(e);
  }
}

async function logout(req, res, next) {
  try {
    const result = await authService.logout();
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
    return res.status(result.status).json(result.body);
  } catch (e) {
    next(e);
  }
}

module.exports = { signup, login, me, updateProfileImage, refresh, logout };
