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

async function upsertRoomPlace({
  roomId,
  actorId,
  placeId,
  name,
  category,
  lat,
  lng,
  metaJson,
}) {
  const [result] = await pool.query(
    `INSERT INTO \`RoomPlace\`
      (room_id, created_by, place_id, name, category, lat, lng, meta_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       category = VALUES(category),
       lat = VALUES(lat),
       lng = VALUES(lng),
       meta_json = VALUES(meta_json)`,
    [roomId, actorId, placeId, name, category ?? null, lat ?? null, lng ?? null, toJsonValue(metaJson)]
  );
  return result.insertId;
}

async function listRoomPlaces({ roomId }) {
  const [rows] = await pool.query(
    `SELECT
        id,
        place_id AS placeId,
        name,
        category,
        lat,
        lng,
        meta_json AS metaJson,
        created_by AS createdBy,
        created_at AS createdAt
     FROM \`RoomPlace\`
     WHERE room_id = ?
     ORDER BY created_at DESC`,
    [roomId]
  );
  return rows;
}

module.exports = {
  upsertRoomPlace,
  listRoomPlaces,
};
