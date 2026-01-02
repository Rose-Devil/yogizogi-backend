const checklistService = require("./checklist.service");

function emitToChecklist(req, checklistId, event, payload = {}) {
  const io = req.app.get("io");
  if (!io) return;

  io.to(`checklist:${checklistId}`).emit(event, { checklistId, ...payload });
}

async function list(req, res, next) {
  try {
    const items = await checklistService.list(req.id);
    return res.json({ items });
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  const title = (req.body?.title || "").trim();
  const description = (req.body?.description || "").trim();

  if (!title) {
    return res.status(400).json({ message: "제목은 필수입니다." });
  }

  try {
    const id = await checklistService.create({
      userId: req.id,
      title,
      description: description || null,
    });
    return res.status(201).json({ id });
  } catch (err) {
    return next(err);
  }
}

async function join(req, res, next) {
  const inviteCode = (req.body?.inviteCode || "").trim();
  if (!inviteCode) {
    return res.status(400).json({ message: "inviteCode는 필수입니다." });
  }

  try {
    const checklistId = await checklistService.joinByInviteCode({
      userId: req.id,
      inviteCode,
    });

    if (!checklistId) {
      return res.status(404).json({ message: "유효하지 않은 초대코드입니다." });
    }

    emitToChecklist(req, checklistId, "members:changed");
    return res.status(200).json({ id: checklistId });
  } catch (err) {
    return next(err);
  }
}

async function detail(req, res, next) {
  const checklistId = req.params.id;
  try {
    const data = await checklistService.detail({ id: checklistId, userId: req.id });
    if (!data) {
      return res
        .status(404)
        .json({ message: "체크리스트를 찾을 수 없습니다." });
    }

    const locations =
      (await checklistService.listLocations({
        checklistId,
        userId: req.id,
      })) || [];

    return res.json({ ...data, locations });
  } catch (err) {
    return next(err);
  }
}

async function addItem(req, res, next) {
  const checklistId = req.params.id;
  const name = (req.body?.name || "").trim();
  const assignedTo = (req.body?.assignedTo || "").trim() || null;
  const quantity = Number.parseInt(req.body?.quantity, 10) || 1;

  if (!name) {
    return res.status(400).json({ message: "아이템 이름은 필수입니다." });
  }

  try {
    const allowed = await checklistService.isMember({
      checklistId,
      userId: req.id,
    });
    if (!allowed) return res.status(403).json({ message: "권한이 없습니다." });

    const id = await checklistService.addItem({
      checklistId,
      name,
      assignedTo,
      quantity: Math.max(1, quantity),
    });

    emitToChecklist(req, checklistId, "checklist:changed");
    return res.status(201).json({ id });
  } catch (err) {
    return next(err);
  }
}

async function updateItemStatus(req, res, next) {
  const checklistId = req.params.id;
  const isCompleted = Boolean(req.body?.isCompleted);

  try {
    const allowed = await checklistService.isMember({
      checklistId,
      userId: req.id,
    });
    if (!allowed) return res.status(403).json({ message: "권한이 없습니다." });

    await checklistService.updateItemStatus({
      checklistId,
      itemId: req.params.itemId,
      isCompleted,
    });

    emitToChecklist(req, checklistId, "checklist:changed");
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
}

async function removeItem(req, res, next) {
  const checklistId = req.params.id;
  try {
    const allowed = await checklistService.isMember({
      checklistId,
      userId: req.id,
    });
    if (!allowed) return res.status(403).json({ message: "권한이 없습니다." });

    await checklistService.removeItem({
      checklistId,
      itemId: req.params.itemId,
    });

    emitToChecklist(req, checklistId, "checklist:changed");
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
}

async function listLocations(req, res, next) {
  const checklistId = req.params.id;
  try {
    const locations = await checklistService.listLocations({
      checklistId,
      userId: req.id,
    });
    if (!locations) return res.status(403).json({ message: "권한이 없습니다." });
    return res.json({ locations });
  } catch (err) {
    return next(err);
  }
}

async function addLocation(req, res, next) {
  const checklistId = req.params.id;
  const name = (req.body?.name || "").trim();
  const address = (req.body?.address || "").trim();
  const tripDate = (req.body?.tripDate || "").trim();
  const sortOrder = req.body?.sortOrder;
  const lat = req.body?.lat;
  const lng = req.body?.lng;
  const kakaoPlaceId = (req.body?.kakaoPlaceId || "").trim();

  try {
    const id = await checklistService.addLocation({
      checklistId,
      userId: req.id,
      name,
      address,
      tripDate: tripDate || null,
      sortOrder,
      lat,
      lng,
      kakaoPlaceId,
    });

    if (!id) {
      return res.status(400).json({ message: "위치를 저장할 수 없습니다." });
    }

    emitToChecklist(req, checklistId, "locations:changed");
    return res.status(201).json({ id });
  } catch (err) {
    return next(err);
  }
}

async function removeLocation(req, res, next) {
  const checklistId = req.params.id;
  const locationId = req.params.locationId;

  try {
    const ok = await checklistService.removeLocation({
      checklistId,
      userId: req.id,
      locationId,
    });

    if (!ok) {
      return res.status(404).json({ message: "위치를 찾을 수 없습니다." });
    }

    emitToChecklist(req, checklistId, "locations:changed");
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
}

async function clearLocations(req, res, next) {
  const checklistId = req.params.id;
  try {
    const ok = await checklistService.clearLocations({
      checklistId,
      userId: req.id,
    });
    if (!ok) return res.status(403).json({ message: "권한이 없습니다." });

    emitToChecklist(req, checklistId, "locations:changed");
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
}

async function reorderLocations(req, res, next) {
  const checklistId = req.params.id;
  const tripDate = (req.body?.tripDate || "").trim();
  const orderedIds = req.body?.orderedIds;

  try {
    const ok = await checklistService.reorderLocations({
      checklistId,
      userId: req.id,
      tripDate: tripDate || null,
      orderedIds,
    });

    if (!ok) return res.status(403).json({ message: "권한이 없습니다." });

    emitToChecklist(req, checklistId, "locations:changed");
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  list,
  create,
  join,
  detail,
  addItem,
  updateItemStatus,
  removeItem,
  listLocations,
  addLocation,
  removeLocation,
  clearLocations,
  reorderLocations,
};
