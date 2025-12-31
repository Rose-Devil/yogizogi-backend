const roomPlacesRepo = require("./roomPlaces.repository");
const { appendChangeLog } = require("../rooms/roomChangeLog.repository");
const { emitToRoom } = require("../../ws/broker");

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

async function list(req, res, next) {
  const roomId = Number(req.params.roomId);
  if (!Number.isFinite(roomId)) return badRequest(res, "roomId가 올바르지 않습니다.");
  try {
    const items = await roomPlacesRepo.listRoomPlaces({ roomId });
    return res.json({ items });
  } catch (e) {
    return next(e);
  }
}

async function upsert(req, res, next) {
  const roomId = Number(req.params.roomId);
  if (!Number.isFinite(roomId)) return badRequest(res, "roomId가 올바르지 않습니다.");

  const placeId = (req.body?.placeId || "").trim();
  const name = (req.body?.name || "").trim();
  if (!placeId) return badRequest(res, "placeId가 필요합니다.");
  if (!name) return badRequest(res, "name이 필요합니다.");

  const category = (req.body?.category || "").trim() || null;
  const lat = req.body?.lat != null ? Number(req.body.lat) : null;
  const lng = req.body?.lng != null ? Number(req.body.lng) : null;
  const metaJson = req.body?.metaJson ?? null;

  try {
    const id = await roomPlacesRepo.upsertRoomPlace({
      roomId,
      actorId: req.id,
      placeId,
      name,
      category,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      metaJson,
    });

    await appendChangeLog({
      roomId,
      actorId: req.id,
      entityType: "place",
      entityId: id || null,
      action: "UPDATE",
      diffJson: { placeId, name, category, lat, lng },
    });

    emitToRoom(roomId, "place:upserted", {
      roomId,
      actorId: req.id,
      entity: { id, placeId, name, category, lat, lng },
      updatedAt: new Date().toISOString(),
    });

    return res.status(201).json({ id });
  } catch (e) {
    return next(e);
  }
}

module.exports = { list, upsert };

