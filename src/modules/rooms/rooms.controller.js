const { validationResult } = require("express-validator");
const roomsService = require("./rooms.service");

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

async function list(req, res, next) {
  try {
    const rooms = await roomsService.listRooms({ userId: req.id });
    return res.json({ items: rooms });
  } catch (e) {
    return next(e);
  }
}

async function create(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return badRequest(res, errors.array()[0]?.msg || "입력값이 올바르지 않습니다.");

  const title = (req.body?.title || "").trim();
  const description = (req.body?.description || "").trim() || null;
  const travelStartDate = req.body?.travelStartDate ?? null;
  const travelEndDate = req.body?.travelEndDate ?? null;

  try {
    const data = await roomsService.createRoom({
      userId: req.id,
      title,
      description,
      travelStartDate,
      travelEndDate,
    });
    return res.status(201).json(data);
  } catch (e) {
    return next(e);
  }
}

async function detail(req, res, next) {
  const roomId = Number(req.params.roomId);
  if (!Number.isFinite(roomId)) return badRequest(res, "roomId가 올바르지 않습니다.");

  try {
    const data = await roomsService.getRoomDetail({ roomId, userId: req.id });
    if (!data) return res.status(404).json({ success: false, message: "방을 찾을 수 없습니다." });
    return res.json(data);
  } catch (e) {
    return next(e);
  }
}

async function changeMemberRole(req, res, next) {
  const roomId = Number(req.params.roomId);
  const targetUserId = Number(req.params.userId);
  const role = (req.body?.role || "").trim();
  if (!Number.isFinite(roomId)) return badRequest(res, "roomId가 올바르지 않습니다.");
  if (!Number.isFinite(targetUserId)) return badRequest(res, "userId가 올바르지 않습니다.");
  if (!role) return badRequest(res, "role이 필요합니다.");

  try {
    const data = await roomsService.changeMemberRole({
      roomId,
      actorId: req.id,
      targetUserId,
      newRole: role,
    });
    return res.json(data);
  } catch (e) {
    return next(e);
  }
}

module.exports = { list, create, detail, changeMemberRole };

