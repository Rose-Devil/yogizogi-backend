const checklistRepo = require("./roomChecklist.repository");
const { appendChangeLog } = require("./roomChangeLog.repository");
const { emitToRoom } = require("../../ws/broker");

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

async function list(req, res, next) {
  const roomId = Number(req.params.roomId);
  if (!Number.isFinite(roomId)) return badRequest(res, "roomId가 올바르지 않습니다.");
  try {
    const items = await checklistRepo.listChecklist({ roomId });
    return res.json({ items });
  } catch (e) {
    return next(e);
  }
}

async function create(req, res, next) {
  const roomId = Number(req.params.roomId);
  if (!Number.isFinite(roomId)) return badRequest(res, "roomId가 올바르지 않습니다.");

  const name = (req.body?.name || "").trim();
  if (!name) return badRequest(res, "name이 필요합니다.");

  const category = (req.body?.category || "").trim() || null;
  const quantity = Number(req.body?.quantity ?? 1);
  const safeQty = Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1;
  const assignedUserId = req.body?.assignedUserId != null ? Number(req.body.assignedUserId) : null;
  const safeAssignedUserId = Number.isFinite(assignedUserId) ? assignedUserId : null;

  try {
    const id = await checklistRepo.createChecklistItem({
      roomId,
      category,
      name,
      quantity: safeQty,
      assignedUserId: safeAssignedUserId,
    });

    await appendChangeLog({
      roomId,
      actorId: req.id,
      entityType: "checklist_item",
      entityId: id,
      action: "CREATE",
      diffJson: { category, name, quantity: safeQty, assignedUserId: safeAssignedUserId },
    });

    emitToRoom(roomId, "checklist:created", {
      roomId,
      actorId: req.id,
      entity: { id, category, name, quantity: safeQty, assignedUserId: safeAssignedUserId },
      updatedAt: new Date().toISOString(),
    });

    return res.status(201).json({ id });
  } catch (e) {
    // ER_DUP_ENTRY due to unique(room_id,category,name)
    if (e?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "이미 존재하는 체크리스트 항목입니다." });
    }
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
  for (const key of ["category", "name", "quantity", "assignedUserId", "isDone"]) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) patch[key] = req.body[key];
  }
  if (Object.prototype.hasOwnProperty.call(patch, "name")) {
    patch.name = String(patch.name || "").trim();
    if (!patch.name) return badRequest(res, "name이 올바르지 않습니다.");
  }
  if (Object.prototype.hasOwnProperty.call(patch, "category")) {
    patch.category = String(patch.category || "").trim() || null;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "quantity")) {
    const q = Number(patch.quantity);
    patch.quantity = Number.isFinite(q) ? Math.max(1, Math.floor(q)) : 1;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "assignedUserId")) {
    const au = patch.assignedUserId != null ? Number(patch.assignedUserId) : null;
    patch.assignedUserId = Number.isFinite(au) ? au : null;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "isDone")) {
    patch.isDone = Boolean(patch.isDone);
  }

  try {
    const result = await checklistRepo.patchChecklistItem({
      roomId,
      itemId,
      expectedVersion,
      patch,
    });

    if (!result.ok && result.code === "VERSION_CONFLICT") {
      return res.status(409).json({ success: false, message: "다른 사용자가 먼저 수정했습니다. 새로고침 후 다시 시도하세요." });
    }

    await appendChangeLog({
      roomId,
      actorId: req.id,
      entityType: "checklist_item",
      entityId: itemId,
      action: "UPDATE",
      diffJson: patch,
    });

    emitToRoom(roomId, "checklist:updated", {
      roomId,
      actorId: req.id,
      entity: { id: itemId, ...patch, version: expectedVersion + 1 },
      updatedAt: new Date().toISOString(),
    });

    return res.json({ ok: true });
  } catch (e) {
    if (e?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "이미 존재하는 체크리스트 항목입니다." });
    }
    return next(e);
  }
}

async function remove(req, res, next) {
  const roomId = Number(req.params.roomId);
  const itemId = Number(req.params.itemId);
  if (!Number.isFinite(roomId)) return badRequest(res, "roomId가 올바르지 않습니다.");
  if (!Number.isFinite(itemId)) return badRequest(res, "itemId가 올바르지 않습니다.");

  try {
    const ok = await checklistRepo.deleteChecklistItem({ roomId, itemId });
    if (!ok) return res.status(404).json({ success: false, message: "항목을 찾을 수 없습니다." });

    await appendChangeLog({
      roomId,
      actorId: req.id,
      entityType: "checklist_item",
      entityId: itemId,
      action: "DELETE",
      diffJson: null,
    });

    emitToRoom(roomId, "checklist:deleted", {
      roomId,
      actorId: req.id,
      entity: { id: itemId },
      updatedAt: new Date().toISOString(),
    });

    return res.json({ ok: true });
  } catch (e) {
    return next(e);
  }
}

module.exports = { list, create, patch, remove };

