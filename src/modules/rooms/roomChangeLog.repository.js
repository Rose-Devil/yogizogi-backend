const { pool } = require("../../config/db");

function toJsonValue(value) {
  if (value == null) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

async function appendChangeLog({ roomId, actorId, entityType, entityId, action, diffJson }) {
  await pool.query(
    `INSERT INTO \`RoomChangeLog\`
      (room_id, actor_id, entity_type, entity_id, action, diff_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [roomId, actorId ?? null, entityType, entityId ?? null, action, toJsonValue(diffJson)]
  );
}

async function listRoomChangeLogs({ roomId, limit = 50 }) {
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));
  const [rows] = await pool.query(
    `SELECT
        id,
        actor_id AS actorId,
        entity_type AS entityType,
        entity_id AS entityId,
        action,
        diff_json AS diffJson,
        created_at AS createdAt
     FROM \`RoomChangeLog\`
     WHERE room_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [roomId, safeLimit]
  );
  return rows;
}

module.exports = { appendChangeLog, listRoomChangeLogs };
