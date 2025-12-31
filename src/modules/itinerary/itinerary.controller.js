const itineraryService = require("./itinerary.service");

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

function requireDate(req, res) {
  const dayDate = String(req.query?.date || req.body?.dayDate || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayDate)) {
    res.status(400).json({ success: false, message: "date(YYYY-MM-DD)가 필요합니다." });
    return null;
  }
  return dayDate;
}

async function list(req, res, next) {
  const roomId = Number(req.params.roomId);
  if (!Number.isFinite(roomId)) return badRequest(res, "roomId가 올바르지 않습니다.");
  const dayDate = requireDate(req, res);
  if (!dayDate) return;

  try {
    const data = await itineraryService.list({ roomId, dayDate });
    return res.json(data);
  } catch (e) {
    return next(e);
  }
}

async function create(req, res, next) {
  const roomId = Number(req.params.roomId);
  if (!Number.isFinite(roomId)) return badRequest(res, "roomId가 올바르지 않습니다.");
  const dayDate = String(req.body?.dayDate || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayDate)) return badRequest(res, "dayDate(YYYY-MM-DD)가 필요합니다.");

  const title = (req.body?.title || "").trim();
  if (!title) return badRequest(res, "title이 필요합니다.");

  const memo = req.body?.memo ?? null;
  const placeId = req.body?.placeId ?? null;
  const placeRefId = req.body?.placeRefId ?? null;
  const startTime = req.body?.startTime ?? null; // "HH:MM"
  const durationMin = req.body?.durationMin ?? null;
  const status = (req.body?.status || "CANDIDATE").trim();

  try {
    const data = await itineraryService.create({
      roomId,
      actorId: req.id,
      dayDate,
      title,
      memo,
      placeId,
      placeRefId,
      startTime,
      durationMin,
      status,
    });
    return res.status(201).json(data);
  } catch (e) {
    return next(e);
  }
}

async function patch(req, res, next) {
  const roomId = Number(req.params.roomId);
  const itemId = Number(req.params.itemId);
  if (!Number.isFinite(roomId)) return badRequest(res, "roomId가 올바르지 않습니다.");
  if (!Number.isFinite(itemId)) return badRequest(res, "itemId가 올바르지 않습니다.");

  const expectedVersion = Number(req.body?.version);
  if (!Number.isFinite(expectedVersion)) return badRequest(res, "version(정수)이 필요합니다.");

  const patch = {};
  for (const key of ["title", "memo", "placeId", "placeRefId", "startTime", "durationMin", "status"]) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) patch[key] = req.body[key];
  }

  try {
    const data = await itineraryService.patch({
      roomId,
      actorId: req.id,
      itemId,
      expectedVersion,
      patch,
    });
    return res.json(data);
  } catch (e) {
    return next(e);
  }
}

async function remove(req, res, next) {
  const roomId = Number(req.params.roomId);
  const itemId = Number(req.params.itemId);
  if (!Number.isFinite(roomId)) return badRequest(res, "roomId가 올바르지 않습니다.");
  if (!Number.isFinite(itemId)) return badRequest(res, "itemId가 올바르지 않습니다.");

  try {
    const data = await itineraryService.remove({ roomId, actorId: req.id, itemId });
    return res.json(data);
  } catch (e) {
    return next(e);
  }
}

async function reorder(req, res, next) {
  const roomId = Number(req.params.roomId);
  if (!Number.isFinite(roomId)) return badRequest(res, "roomId가 올바르지 않습니다.");

  const dayDate = String(req.body?.dayDate || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayDate)) return badRequest(res, "dayDate(YYYY-MM-DD)가 필요합니다.");

  const orderedItemIds = Array.isArray(req.body?.orderedItemIds) ? req.body.orderedItemIds : null;
  if (!orderedItemIds || orderedItemIds.length === 0) return badRequest(res, "orderedItemIds가 필요합니다.");

  const expectedDayVersion = req.body?.dayVersion;

  try {
    const data = await itineraryService.reorder({
      roomId,
      actorId: req.id,
      dayDate,
      expectedDayVersion,
      orderedItemIds,
    });
    return res.json(data);
  } catch (e) {
    return next(e);
  }
}

module.exports = { list, create, patch, remove, reorder };

