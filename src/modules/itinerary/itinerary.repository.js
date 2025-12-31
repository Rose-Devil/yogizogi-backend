const { pool } = require("../../config/db");

async function ensureDayRow({ conn, roomId, dayDate }) {
  await conn.query(
    `INSERT INTO \`RoomItineraryDay\` (room_id, day_date, version)
     VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE id = id`,
    [roomId, dayDate]
  );
}

async function getDayVersion({ roomId, dayDate }) {
  const [rows] = await pool.query(
    `SELECT version
     FROM \`RoomItineraryDay\`
     WHERE room_id = ? AND day_date = ?
     LIMIT 1`,
    [roomId, dayDate]
  );
  return rows[0]?.version ?? 1;
}

async function listItinerary({ roomId, dayDate }) {
  const [rows] = await pool.query(
    `SELECT
        i.id,
        i.day_date AS dayDate,
        i.order_index AS orderIndex,
        i.title,
        i.memo,
        i.place_id AS placeId,
        i.place_ref_id AS placeRefId,
        p.name AS placeName,
        p.lat,
        p.lng,
        p.category AS placeCategory,
        i.start_time AS startTime,
        i.duration_min AS durationMin,
        i.status,
        i.version,
        i.created_by AS createdBy,
        i.updated_by AS updatedBy,
        i.created_at AS createdAt,
        i.updated_at AS updatedAt
     FROM \`RoomItineraryItem\` i
     LEFT JOIN \`RoomPlace\` p ON p.id = i.place_ref_id
     WHERE i.room_id = ? AND i.day_date = ?
     ORDER BY i.order_index ASC, i.id ASC`,
    [roomId, dayDate]
  );
  return rows;
}

async function createItineraryItem({
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
}) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await ensureDayRow({ conn, roomId, dayDate });

    const [result] = await conn.query(
      `INSERT INTO \`RoomItineraryItem\`
        (room_id, day_date, order_index, title, memo, place_id, place_ref_id, start_time, duration_min, status, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        roomId,
        dayDate,
        orderIndex,
        title,
        memo ?? null,
        placeId ?? null,
        placeRefId ?? null,
        startTime ?? null,
        durationMin ?? null,
        status,
        actorId,
        actorId,
      ]
    );

    await conn.commit();
    return result.insertId;
  } catch (e) {
    try {
      await conn.rollback();
    } catch {}
    throw e;
  } finally {
    conn.release();
  }
}

async function updateItineraryItem({
  roomId,
  itemId,
  expectedVersion,
  patch,
  actorId,
}) {
  const allowed = {
    title: "title",
    memo: "memo",
    placeId: "place_id",
    placeRefId: "place_ref_id",
    startTime: "start_time",
    durationMin: "duration_min",
    status: "status",
  };

  const fields = [];
  const values = [];
  for (const [key, column] of Object.entries(allowed)) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      fields.push(`${column} = ?`);
      values.push(patch[key] ?? null);
    }
  }

  if (fields.length === 0) return { ok: true, changed: false };

  values.push(actorId);
  values.push(roomId, itemId, expectedVersion);

  const [result] = await pool.query(
    `UPDATE \`RoomItineraryItem\`
     SET ${fields.join(", ")},
         updated_by = ?,
         version = version + 1
     WHERE room_id = ? AND id = ? AND version = ?`,
    values
  );

  if (result.affectedRows === 0) return { ok: false, code: "VERSION_CONFLICT" };
  return { ok: true, changed: true };
}

async function deleteItineraryItem({ roomId, itemId }) {
  const [result] = await pool.query(
    `DELETE FROM \`RoomItineraryItem\`
     WHERE room_id = ? AND id = ?`,
    [roomId, itemId]
  );
  return result.affectedRows > 0;
}

async function reorderItinerary({
  roomId,
  dayDate,
  expectedDayVersion,
  orderedItemIds,
  actorId,
}) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await ensureDayRow({ conn, roomId, dayDate });

    const [[day]] = await conn.query(
      `SELECT id, version
       FROM \`RoomItineraryDay\`
       WHERE room_id = ? AND day_date = ?
       FOR UPDATE`,
      [roomId, dayDate]
    );

    const currentVersion = Number(day?.version ?? 1);
    if (expectedDayVersion != null && Number(expectedDayVersion) !== currentVersion) {
      throw { statusCode: 409, message: "다른 사용자가 먼저 정렬을 변경했습니다. 새로고침 후 다시 시도하세요." };
    }

    const ids = orderedItemIds.map((v) => Number(v)).filter((v) => Number.isFinite(v));
    if (ids.length !== orderedItemIds.length) {
      throw { statusCode: 400, message: "orderedItemIds가 올바르지 않습니다." };
    }

    // Validate ownership of all ids for the room + day
    const [rows] = await conn.query(
      `SELECT id
       FROM \`RoomItineraryItem\`
       WHERE room_id = ? AND day_date = ? AND id IN (${ids.map(() => "?").join(",")})`,
      [roomId, dayDate, ...ids]
    );
    if (rows.length !== ids.length) {
      throw { statusCode: 400, message: "정렬 대상에 포함될 수 없는 일정 항목이 있습니다." };
    }

    // Update order_index in a deterministic order
    for (let i = 0; i < ids.length; i++) {
      await conn.query(
        `UPDATE \`RoomItineraryItem\`
         SET order_index = ?, updated_by = ?, version = version + 1
         WHERE room_id = ? AND id = ?`,
        [i, actorId, roomId, ids[i]]
      );
    }

    await conn.query(
      `UPDATE \`RoomItineraryDay\`
       SET version = version + 1
       WHERE id = ?`,
      [day.id]
    );

    await conn.commit();
    return { dayVersion: currentVersion + 1 };
  } catch (e) {
    try {
      await conn.rollback();
    } catch {}
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = {
  getDayVersion,
  listItinerary,
  createItineraryItem,
  updateItineraryItem,
  deleteItineraryItem,
  reorderItinerary,
};

