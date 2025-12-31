const roomsRepository = require("./rooms.repository");
const { hasAtLeastRole } = require("./roomRoles");

function requireRoomRole(requiredRole) {
  return async (req, res, next) => {
    try {
      const roomId = Number(req.params.roomId || req.params.id);
      if (!Number.isFinite(roomId)) {
        return res.status(400).json({ success: false, message: "roomId가 올바르지 않습니다." });
      }

      const role = await roomsRepository.getMemberRole({ roomId, userId: req.id });
      if (!role) return res.status(403).json({ success: false, message: "방 멤버가 아닙니다." });
      if (!hasAtLeastRole(role, requiredRole)) {
        return res.status(403).json({ success: false, message: "권한이 없습니다." });
      }

      req.room = { id: roomId, myRole: role };
      return next();
    } catch (e) {
      return next(e);
    }
  };
}

module.exports = { requireRoomRole };

