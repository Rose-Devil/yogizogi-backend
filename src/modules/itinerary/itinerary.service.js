const itineraryRepository = require("./itinerary.repository");
const { appendChangeLog } = require("../rooms/roomChangeLog.repository");
const { emitToRoom } = require("../../ws/broker");

async function list({ roomId, dayDate }) {
  const items = await itineraryRepository.listItinerary({ roomId, dayDate });
  const dayVersion = await itineraryRepository.getDayVersion({ roomId, dayDate });
  return { items, dayVersion };
}

async function create({ roomId, actorId, dayDate, title, memo, placeId, placeRefId, startTime, durationMin, status }) {
  const existing = await itineraryRepository.listItinerary({ roomId, dayDate });
  const orderIndex = existing.length;

  const itemId = await itineraryRepository.createItineraryItem({
    roomId,
    dayDate,
    orderIndex,
    title,
    memo,
    placeId,
    placeRefId,
    startTime,
    durationMin,
    status,
    actorId,
  });

  await appendChangeLog({
    roomId,
    actorId,
    entityType: "itinerary_item",
    entityId: itemId,
    action: "CREATE",
    diffJson: { dayDate, title, memo, placeId, placeRefId, startTime, durationMin, status },
  });

  emitToRoom(roomId, "itinerary:created", {
    roomId,
    actorId,
    entity: { id: itemId, dayDate },
    updatedAt: new Date().toISOString(),
  });

  return { id: itemId };
}

async function patch({ roomId, actorId, itemId, expectedVersion, patch }) {
  const result = await itineraryRepository.updateItineraryItem({
    roomId,
    itemId,
    expectedVersion,
    patch,
    actorId,
  });

  if (!result.ok && result.code === "VERSION_CONFLICT") {
    throw { statusCode: 409, message: "다른 사용자가 먼저 수정했습니다. 새로고침 후 다시 시도하세요." };
  }

  await appendChangeLog({
    roomId,
    actorId,
    entityType: "itinerary_item",
    entityId: itemId,
    action: "UPDATE",
    diffJson: patch,
  });

  emitToRoom(roomId, "itinerary:updated", {
    roomId,
    actorId,
    entity: { id: itemId, ...patch, version: expectedVersion + 1 },
    updatedAt: new Date().toISOString(),
  });

  return { ok: true };
}

async function remove({ roomId, actorId, itemId }) {
  const ok = await itineraryRepository.deleteItineraryItem({ roomId, itemId });
  if (!ok) throw { statusCode: 404, message: "일정 항목을 찾을 수 없습니다." };

  await appendChangeLog({
    roomId,
    actorId,
    entityType: "itinerary_item",
    entityId: itemId,
    action: "DELETE",
    diffJson: null,
  });

  emitToRoom(roomId, "itinerary:deleted", {
    roomId,
    actorId,
    entity: { id: itemId },
    updatedAt: new Date().toISOString(),
  });

  return { ok: true };
}

async function reorder({ roomId, actorId, dayDate, expectedDayVersion, orderedItemIds }) {
  const data = await itineraryRepository.reorderItinerary({
    roomId,
    dayDate,
    expectedDayVersion,
    orderedItemIds,
    actorId,
  });

  await appendChangeLog({
    roomId,
    actorId,
    entityType: "itinerary_day",
    entityId: null,
    action: "REORDER",
    diffJson: { dayDate, orderedItemIds },
  });

  emitToRoom(roomId, "itinerary:reordered", {
    roomId,
    actorId,
    entity: { dayDate, orderedItemIds, dayVersion: data.dayVersion },
    updatedAt: new Date().toISOString(),
  });

  return data;
}

module.exports = { list, create, patch, remove, reorder };

