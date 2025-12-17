// src/common/utils/jwt.js
const jwt = require("jsonwebtoken");
const { config } = require("../../config/env");

// Access: 12시간, Refresh: 3일
const ACCESS_EXPIRES_IN = "12h";
const REFRESH_EXPIRES_IN = "3d";

function createAccessToken(userId) {
  return jwt.sign({ id: userId, typ: "access" }, config.jwt.secretKey, {
    expiresIn: ACCESS_EXPIRES_IN,
  });
}

function createRefreshToken(userId) {
  return jwt.sign({ id: userId, typ: "refresh" }, config.jwt.secretKey, {
    expiresIn: REFRESH_EXPIRES_IN,
  });
}

function verifyToken(token) {
  return jwt.verify(token, config.jwt.secretKey);
}

module.exports = { createAccessToken, createRefreshToken, verifyToken };
