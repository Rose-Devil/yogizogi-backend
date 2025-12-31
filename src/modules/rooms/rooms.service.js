const roomsRepository = require("./rooms.repository");
const { ROOM_ROLES, isValidRole, hasAtLeastRole } = require("./roomRoles");
const { appendChangeLog } = require("./roomChangeLog.repository");
const { emitToRoom } = require("../../ws/broker");

async function listRooms({ userId }) {
  return roomsRepository.listRoomsForUser(userId);
}

async function createRoom({ userId, title, description, travelStartDate, travelEndDate }) {
  const roomId = await roomsRepository.createRoom({
    ownerId: userId,
    title,
    description,
    travelStartDate,
    travelEndDate,
  });

  await appendChangeLog({
    roomId,
    actorId: userId,
    entityType: "room",
    entityId: roomId,
    action: "CREATE",
    diffJson: { title, description, travelStartDate, travelEndDate },
  });

  return { roomId };
}

async function getRoomDetail({ roomId, userId }) {
  const room = await roomsRepository.findRoomById(roomId);
  if (!room) return null;

  const myRole = await roomsRepository.getMemberRole({ roomId, userId });
  if (!myRole) throw { statusCode: 403, message: "방 멤버가 아닙니다." };

  const members = await roomsRepository.listMembers({ roomId });
  return { room, myRole, members };
}

async function changeMemberRole({ roomId, actorId, targetUserId, newRole }) {
  if (!isValidRole(newRole)) throw { statusCode: 400, message: "role이 올바르지 않습니다." };

  const actorRole = await roomsRepository.getMemberRole({ roomId, userId: actorId });
  if (!actorRole) throw { statusCode: 403, message: "방 멤버가 아닙니다." };
  if (!hasAtLeastRole(actorRole, ROOM_ROLES.OWNER)) throw { statusCode: 403, message: "권한이 없습니다." };

  const ok = await roomsRepository.updateMemberRole({ roomId, userId: targetUserId, role: newRole });
  if (!ok) throw { statusCode: 404, message: "대상 멤버를 찾을 수 없습니다." };

  await appendChangeLog({
    roomId,
    actorId,
    entityType: "member",
    entityId: targetUserId,
    action: "UPDATE",
    diffJson: { role: newRole },
  });

  emitToRoom(roomId, "member:role_updated", {
    roomId,
    actorId,
    entity: { userId: targetUserId, role: newRole },
    updatedAt: new Date().toISOString(),
  });

  return { ok: true };
}

module.exports = {
  listRooms,
  createRoom,
  getRoomDetail,
  changeMemberRole,
};

