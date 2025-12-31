const { WebSocketServer } = require("ws");
const url = require("url");
const { verifyToken } = require("../common/utils/jwt");
const { setEmitter } = require("./broker");
const roomsRepository = require("../modules/rooms/rooms.repository");

function createWsServer({ httpServer, path = "/ws" }) {
  const wss = new WebSocketServer({ server: httpServer, path });

  const roomSockets = new Map(); // roomId -> Set(ws)

  function joinRoom(ws, roomId) {
    const key = String(roomId);
    if (!roomSockets.has(key)) roomSockets.set(key, new Set());
    roomSockets.get(key).add(ws);
    ws._roomId = key;
  }

  function leaveRoom(ws) {
    const key = ws._roomId;
    if (!key) return;
    const set = roomSockets.get(key);
    if (set) {
      set.delete(ws);
      if (set.size === 0) roomSockets.delete(key);
    }
    ws._roomId = null;
  }

  function broadcast(roomId, event, payload) {
    const set = roomSockets.get(String(roomId));
    if (!set) return;
    const msg = JSON.stringify({ event, payload });
    for (const ws of set) {
      if (ws.readyState === ws.OPEN) ws.send(msg);
    }
  }

  setEmitter(broadcast);

  wss.on("connection", (ws, req) => {
    const { query } = url.parse(req.url, true);
    const token = String(query?.token || "").trim();
    const roomId = String(query?.roomId || "").trim();

    if (!token || !roomId) {
      ws.close(1008, "token and roomId required");
      return;
    }

    try {
      const decoded = verifyToken(token);
      if (decoded?.typ !== "access") throw new Error("invalid token");
      ws._userId = decoded.id;
    } catch {
      ws.close(1008, "invalid token");
      return;
    }

    // Authorization: only room members can join WS room.
    roomsRepository
      .getMemberRole({ roomId: Number(roomId), userId: ws._userId })
      .then((role) => {
        if (!role) {
          ws.close(1008, "not a member");
          return;
        }
        joinRoom(ws, roomId);
      })
      .catch(() => {
        ws.close(1011, "server error");
      });

    ws.on("message", (data) => {
      // Optional client->server messages (soft-lock/presence)
      let msg = null;
      try {
        msg = JSON.parse(String(data));
      } catch {
        return;
      }
      if (msg?.type === "ping") {
        ws.send(JSON.stringify({ event: "pong", payload: { t: Date.now() } }));
      }
    });

    ws.on("close", () => {
      leaveRoom(ws);
    });
  });

  return wss;
}

module.exports = { createWsServer };
