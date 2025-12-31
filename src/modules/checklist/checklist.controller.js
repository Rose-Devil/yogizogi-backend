const checklistService = require("./checklist.service");

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
    const created = await checklistService.create({
      userId: req.id,
      title,
      description: description || null,
    });
    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
}

async function detail(req, res, next) {
  try {
    const data = await checklistService.detail({
      id: req.params.id,
      userId: req.id,
    });
    if (!data) {
      return res
        .status(404)
        .json({ message: "체크리스트를 찾을 수 없습니다." });
    }
    return res.json(data);
  } catch (err) {
    return next(err);
  }
}

async function getInvite(req, res, next) {
  try {
    const data = await checklistService.getInvite({
      checklistId: req.params.id,
      userId: req.id,
    });
    return res.json(data);
  } catch (err) {
    return next(err);
  }
}

async function requestJoinOtp(req, res, next) {
  const inviteCode = (req.body?.inviteCode || "").trim();
  if (!inviteCode)
    return res.status(400).json({ message: "inviteCode는 필수입니다." });

  try {
    const data = await checklistService.requestJoinOtp({
      userId: req.id,
      inviteCode,
    });
    return res.status(200).json(data);
  } catch (err) {
    return next(err);
  }
}

async function verifyJoinOtp(req, res, next) {
  const inviteCode = (req.body?.inviteCode || "").trim();
  const code = (req.body?.code || "").trim();
  if (!inviteCode)
    return res.status(400).json({ message: "inviteCode는 필수입니다." });
  if (!code) return res.status(400).json({ message: "code는 필수입니다." });

  try {
    const data = await checklistService.verifyJoinOtp({
      userId: req.id,
      inviteCode,
      code,
    });
    return res.status(200).json(data);
  } catch (err) {
    return next(err);
  }
}

async function join(req, res, next) {
  const inviteCode = (req.body?.inviteCode || "").trim();
  const ticket = (req.body?.ticket || "").trim();
  if (!inviteCode)
    return res.status(400).json({ message: "inviteCode는 필수입니다." });
  if (!ticket) return res.status(400).json({ message: "ticket은 필수입니다." });

  try {
    const data = await checklistService.joinByInvite({
      userId: req.id,
      inviteCode,
      ticket,
    });
    return res.status(200).json(data);
  } catch (err) {
    return next(err);
  }
}

async function addItem(req, res, next) {
  const name = (req.body?.name || "").trim();
  const assignedTo = req.body?.assignedTo ?? null;
  const quantity = Number.parseInt(req.body?.quantity, 10) || 1;

  if (!name) {
    return res.status(400).json({ message: "항목 이름은 필수입니다." });
  }

  try {
    const result = await checklistService.addItem({
      userId: req.id,
      checklistId: req.params.id,
      userId: req.id,
      name,
      assignedTo,
      quantity: Math.max(1, quantity),
    });

    if (!result?.ok) {
      return res
        .status(result?.status || 500)
        .json({ message: "ì ‘ê·¼ ?Œí•œ?´ ?†ìŠµ?ˆë‹¤." });
    }

    return res.status(201).json({ id: result.id });
  } catch (err) {
    return next(err);
  }
}

async function updateItemStatus(req, res, next) {
  const isCompleted = Boolean(req.body?.isCompleted);

  try {
    const result = await checklistService.updateItemStatus({
      userId: req.id,
      checklistId: req.params.id,
      userId: req.id,
      itemId: req.params.itemId,
      isCompleted,
    });

    if (!result?.ok) {
      return res
        .status(result?.status || 500)
        .json({ message: "ì ‘ê·¼ ?Œí•œ?´ ?†ìŠµ?ˆë‹¤." });
    }
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
}

async function removeItem(req, res, next) {
  try {
    const result = await checklistService.removeItem({
      userId: req.id,
      checklistId: req.params.id,
      userId: req.id,
      itemId: req.params.itemId,
    });

    if (!result?.ok) {
      return res
        .status(result?.status || 500)
        .json({ message: "ì ‘ê·¼ ?Œí•œ?´ ?†ìŠµ?ˆë‹¤." });
    }
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
}

async function getInvitePreview(req, res, next) {
  try {
    const inviteCode = String(req.query?.inviteCode || "").trim();
    if (!inviteCode) {
      return res.status(400).json({ message: "ì´ˆëŒ€ ì½”ë“œê°€ ?„ìš”?©ë‹ˆ??" });
    }

    const data = await checklistService.getInvitePreview({
      userId: req.id,
      inviteCode,
    });
    if (!data) {
      return res
        .status(404)
        .json({ message: "ì´ˆëŒ€ ì½”ë“œê°€ ?¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤." });
    }

    return res.json(data);
  } catch (err) {
    return next(err);
  }
}

async function join(req, res, next) {
  try {
    const inviteCode = String(req.body?.inviteCode || "").trim();
    if (!inviteCode) {
      return res.status(400).json({ message: "ì´ˆëŒ€ ì½”ë“œê°€ ?„ìš”?©ë‹ˆ??" });
    }

    const result = await checklistService.joinByInviteCode({
      userId: req.id,
      inviteCode,
    });

    return res.status(result.status).json(result.body);
  } catch (err) {
    return next(err);
  }
}

async function requestJoinOtp(req, res, next) {
  try {
    const inviteCode = String(req.body?.inviteCode || "").trim();
    if (!inviteCode) {
      return res.status(400).json({ message: "ì´ˆëŒ€ ì½”ë“œê°€ ?„ìš”?©ë‹ˆ??" });
    }

    const result = await checklistService.requestJoinOtp({
      userId: req.id,
      inviteCode,
    });
    return res.status(result.status).json(result.body);
  } catch (err) {
    return next(err);
  }
}

async function verifyJoinOtp(req, res, next) {
  try {
    const inviteCode = String(req.body?.inviteCode || "").trim();
    const code = String(req.body?.code || "").trim();

    if (!inviteCode || !code) {
      return res
        .status(400)
        .json({ message: "ì´ˆëŒ€ ì½”ë“œì™€ OTPë¥??„ìš”?©ë‹ˆ??" });
    }

    const result = await checklistService.verifyJoinOtpAndJoin({
      userId: req.id,
      inviteCode,
      code,
    });

    return res.status(result.status).json(result.body);
  } catch (err) {
    return next(err);
  }
}

async function leave(req, res, next) {
  try {
    const result = await checklistService.leave({
      userId: req.id,
      checklistId: req.params.id,
    });
    if (!result.ok) {
      return res.status(result.status).json(result.body);
    }
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
}

async function getInviteCode(req, res, next) {
  try {
    const result = await checklistService.getInviteCode({
      userId: req.id,
      checklistId: req.params.id,
    });
    return res.status(result.status).json(result.body);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  list,
  create,
  detail,
  getInvite,
  requestJoinOtp,
  verifyJoinOtp,
  join,
  addItem,
  updateItemStatus,
  removeItem,
  getInvitePreview,
  join,
  requestJoinOtp,
  verifyJoinOtp,
  leave,
  getInviteCode,
};
