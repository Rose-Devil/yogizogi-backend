const invitesService = require("./invites.service");

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

async function accept(req, res, next) {
  const token = (req.body?.token || "").trim() || null;
  const code = (req.body?.code || "").trim() || null;
  const confirm = Boolean(req.body?.confirm);

  if (!token && !code) return badRequest(res, "token 또는 code가 필요합니다.");
  if (token && code) return badRequest(res, "token과 code는 동시에 사용할 수 없습니다.");
  if (code && !/^[0-9]{6}$/.test(code)) return badRequest(res, "code 형식이 올바르지 않습니다.");

  try {
    const data = await invitesService.accept({ token, code, confirm, userId: req.id });
    return res.status(200).json(data);
  } catch (e) {
    return next(e);
  }
}

async function create(req, res, next) {
  const roomId = Number(req.params.roomId);
  if (!Number.isFinite(roomId)) return badRequest(res, "roomId가 올바르지 않습니다.");

  const expiresInDays = req.body?.expiresInDays;
  const maxUses = req.body?.maxUses;
  const includeCode = Boolean(req.body?.includeCode);

  try {
    const data = await invitesService.createInvite({
      roomId,
      actorId: req.id,
      expiresInDays,
      maxUses,
      includeCode,
    });

    // Frontend deep-link suggestion (token is raw, never stored server-side).
    const origin = req.headers.origin || "";
    const acceptUrl = origin ? `${origin}/rooms/join?token=${encodeURIComponent(data.token)}` : null;

    return res.status(201).json({ ...data, acceptUrl });
  } catch (e) {
    return next(e);
  }
}

module.exports = { accept, create };

