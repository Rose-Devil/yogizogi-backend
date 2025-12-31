const { config } = require("../../config/env");
const invitesRepository = require("./invites.repository");
const roomsRepository = require("../rooms/rooms.repository");
const { appendChangeLog } = require("../rooms/roomChangeLog.repository");
const { emitToRoom } = require("../../ws/broker");
const { randomToken, randomNumericCode, sha256Hex } = require("../../common/utils/crypto");

function invitePepper() {
  return config.invites?.secret || config.otp?.secret || process.env.INVITE_SECRET || process.env.OTP_SECRET || "";
}

function hashInviteValue(value) {
  const pepper = invitePepper();
  if (!pepper) throw { statusCode: 500, message: "INVITE_SECRET 설정이 필요합니다." };
  return sha256Hex(`${pepper}:${value}`);
}

function inviteDefaults() {
  return {
    expiresInDays: 7,
    maxUses: 10,
    includeCode: false,
  };
}

async function createInvite({ roomId, actorId, expiresInDays, maxUses, includeCode }) {
  const actorRole = await roomsRepository.getMemberRole({ roomId, userId: actorId });
  if (actorRole !== "OWNER") throw { statusCode: 403, message: "권한이 없습니다." };

  const rawToken = randomToken({ bytes: 32 }); // 64 hex chars
  const tokenHash = hashInviteValue(rawToken);

  const wantCode = Boolean(includeCode);
  const rawCode = wantCode ? randomNumericCode({ digits: 6 }) : null;
  const codeHash = wantCode ? hashInviteValue(rawCode) : null;

  const safeMaxUses = Math.min(100, Math.max(1, Number(maxUses) || inviteDefaults().maxUses));
  const ttlDays = Math.min(30, Math.max(1, Number(expiresInDays) || inviteDefaults().expiresInDays));
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  const inviteId = await invitesRepository.createInvite({
    roomId,
    createdBy: actorId,
    tokenHash,
    codeHash,
    expiresAt,
    maxUses: safeMaxUses,
  });

  await appendChangeLog({
    roomId,
    actorId,
    entityType: "invite",
    entityId: inviteId,
    action: "CREATE",
    diffJson: { expiresAt: expiresAt.toISOString(), maxUses: safeMaxUses, hasCode: wantCode },
  });

  return {
    inviteId,
    token: rawToken,
    code: rawCode,
    expiresAt: expiresAt.toISOString(),
    maxUses: safeMaxUses,
  };
}

async function previewAccept({ token, code, userId }) {
  const roomIdAndInvite = await resolveInvite({ token, code });

  const room = await roomsRepository.findRoomById(roomIdAndInvite.roomId);
  if (!room) throw { statusCode: 404, message: "방을 찾을 수 없습니다." };

  const existingRole = await roomsRepository.getMemberRole({ roomId: room.id, userId });

  return {
    room: { id: room.id, title: room.title, description: room.description },
    alreadyMember: Boolean(existingRole),
  };
}

async function resolveInvite({ token, code }) {
  if (token) {
    const row = await invitesRepository.findActiveInviteByTokenHash(hashInviteValue(token));
    if (!row) throw { statusCode: 404, message: "유효하지 않은 초대 링크입니다." };
    return row;
  }

  if (code) {
    const row = await invitesRepository.findActiveInviteByCodeHash(hashInviteValue(code));
    if (!row) throw { statusCode: 404, message: "유효하지 않은 초대 코드입니다." };
    return row;
  }

  throw { statusCode: 400, message: "token 또는 code가 필요합니다." };
}

async function accept({ token, code, confirm, userId }) {
  const invite = await resolveInvite({ token, code });

  if (!confirm) {
    return previewAccept({ token, code, userId });
  }

  const result = await invitesRepository.acceptInviteTransaction({
    inviteId: invite.id,
    userId,
    role: "EDITOR",
  });

  await appendChangeLog({
    roomId: result.roomId,
    actorId: userId,
    entityType: "member",
    entityId: userId,
    action: "CREATE",
    diffJson: { via: token ? "token" : "code" },
  });

  emitToRoom(result.roomId, "member:joined", {
    roomId: result.roomId,
    actorId: userId,
    entity: { userId },
    updatedAt: new Date().toISOString(),
  });

  return { roomId: result.roomId, alreadyMember: result.alreadyMember };
}

module.exports = {
  inviteDefaults,
  createInvite,
  accept,
  previewAccept,
  hashInviteValue,
};

