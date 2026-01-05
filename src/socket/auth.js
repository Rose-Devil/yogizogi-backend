const { verifyToken } = require("../common/utils/jwt");

function extractTokenFromSocket(socket) {
  const fromAuth = socket.handshake?.auth?.token;
  if (typeof fromAuth === "string" && fromAuth.trim()) return fromAuth.trim();

  const fromHeader = socket.handshake?.headers?.authorization;
  if (typeof fromHeader === "string" && fromHeader.startsWith("Bearer ")) {
    return fromHeader.slice("Bearer ".length).trim();
  }

  return null;
}

function authenticateSocket(socket) {
  const token = extractTokenFromSocket(socket);
  if (!token) return null;

  const decoded = verifyToken(token);
  if (decoded?.typ !== "access") return null;

  return { userId: decoded.id, token };
}

module.exports = { authenticateSocket };
