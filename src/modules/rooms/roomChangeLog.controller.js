const { listRoomChangeLogs } = require("./roomChangeLog.repository");

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

async function list(req, res, next) {
  const roomId = Number(req.params.roomId);
  if (!Number.isFinite(roomId)) return badRequest(res, "roomId가 올바르지 않습니다.");
  const limit = req.query?.limit;
  try {
    const items = await listRoomChangeLogs({ roomId, limit });
    return res.json({ items });
  } catch (e) {
    return next(e);
  }
}

module.exports = { list };

