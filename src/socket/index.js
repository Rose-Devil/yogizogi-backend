const { Server } = require("socket.io");
const { config } = require("../config/env");
const { authenticateSocket } = require("./auth");
const checklistService = require("../modules/checklist/checklist.service");

function setupSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.cors.origins,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const auth = authenticateSocket(socket);
      if (!auth) return next(new Error("unauthorized"));

      socket.data.userId = auth.userId;
      return next();
    } catch (err) {
      return next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("room:join", async (payload, ack) => {
      try {
        const checklistId = String(payload?.checklistId || "").trim();
        if (!checklistId) throw new Error("missing checklistId");

        const allowed = await checklistService.isMember({
          checklistId,
          userId: socket.data.userId,
        });
        if (!allowed) throw new Error("forbidden");

        const roomName = `checklist:${checklistId}`;
        await socket.join(roomName);

        if (typeof ack === "function") ack({ ok: true });
      } catch (err) {
        if (typeof ack === "function") ack({ ok: false, message: err.message });
      }
    });
  });

  return io;
}

module.exports = { setupSockets };
