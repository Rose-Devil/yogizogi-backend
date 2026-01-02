const { pool } = require("../../config/db");
const crypto = require("crypto");

function generateInviteCode() {
  return crypto.randomBytes(8).toString("hex");
}

async function isMember({ checklistId, userId }) {
  const conn = await pool.getConnection();
  try {
    const [[row]] = await conn.query(
      `SELECT 1 AS ok
       FROM \`ChecklistMember\`
       WHERE room_id = ? AND user_id = ?`,
      [checklistId, userId]
    );

    return Boolean(row?.ok);
  } finally {
    conn.release();
  }
}

async function list(userId) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT 
          r.id,
          r.name AS title,
          r.description,
          r.invite_code AS inviteCode,
          r.created_at AS createdAt,
          (SELECT COUNT(*) FROM \`ChecklistItem\` i WHERE i.room_id = r.id) AS itemCount,
          (SELECT COUNT(*) FROM \`ChecklistMember\` m WHERE m.room_id = r.id) AS members
       FROM \`ChecklistRoom\` r
       INNER JOIN \`ChecklistMember\` my
         ON my.room_id = r.id AND my.user_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );

    return rows;
  } finally {
    conn.release();
  }
}

async function create({ userId, title, description }) {
  const conn = await pool.getConnection();
  try {
    let inviteCode = null;
    let insertId = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      inviteCode = generateInviteCode();
      try {
        const [result] = await conn.query(
          `INSERT INTO \`ChecklistRoom\`
            (owner_id, name, description, invite_code)
           VALUES (?, ?, ?, ?)`,
          [userId, title, description ?? null, inviteCode]
        );

        insertId = result.insertId;
        break;
      } catch (err) {
        if (err && err.code === "ER_DUP_ENTRY") continue;
        throw err;
      }
    }

    if (!insertId) {
      throw new Error(
        "Failed to create room: invite_code collision retries exceeded."
      );
    }

    await conn.query(
      `INSERT INTO \`ChecklistMember\` (room_id, user_id, role)
       VALUES (?, ?, 'OWNER')
       ON DUPLICATE KEY UPDATE role = 'OWNER'`,
      [insertId, userId]
    );

    return insertId;
  } finally {
    conn.release();
  }
}

async function joinByInviteCode({ userId, inviteCode }) {
  const code = String(inviteCode || "").trim();
  if (!code) return null;

  const conn = await pool.getConnection();
  try {
    const [[room]] = await conn.query(
      `SELECT id FROM \`ChecklistRoom\` WHERE invite_code = ?`,
      [code]
    );
    if (!room?.id) return null;

    await conn.query(
      `INSERT INTO \`ChecklistMember\` (room_id, user_id, role)
       VALUES (?, ?, 'MEMBER')
       ON DUPLICATE KEY UPDATE role = role`,
      [room.id, userId]
    );

    return room.id;
  } finally {
    conn.release();
  }
}

async function detail({ id, userId }) {
  const conn = await pool.getConnection();
  try {
    if (userId != null) {
      const allowed = await isMember({ checklistId: id, userId });
      if (!allowed) return null;
    }

    const [[checklist]] = await conn.query(
      `SELECT 
          id,
          name AS title,
          description,
          invite_code AS inviteCode,
          created_at AS createdAt
       FROM \`ChecklistRoom\`
       WHERE id = ?`,
      [id]
    );
    if (!checklist) return null;

    const [items] = await conn.query(
      `SELECT
          i.id,
          i.name,
          u.nickname AS assignedTo,
          i.assignee_id AS assigneeId,
          i.quantity,
          (i.status = 'DONE') AS isCompleted
       FROM \`ChecklistItem\` i
       LEFT JOIN \`User\` u ON u.id = i.assignee_id
       WHERE i.room_id = ?
       ORDER BY i.id`,
      [id]
    );

    const [members] = await conn.query(
      `SELECT 
          m.id,
          u.nickname AS name,
          m.role
       FROM \`ChecklistMember\` m
       LEFT JOIN \`User\` u ON u.id = m.user_id
       WHERE m.room_id = ?`,
      [id]
    );

    return { checklist, items, members };
  } finally {
    conn.release();
  }
}

async function addItem({ checklistId, name, assignedTo, quantity }) {
  const conn = await pool.getConnection();
  try {
    const assigneeId =
      assignedTo !== undefined &&
      assignedTo !== null &&
      String(assignedTo).trim() !== ""
        ? Number(assignedTo)
        : null;

    const safeAssigneeId = Number.isFinite(assigneeId) ? assigneeId : null;
    const safeQty = Number.isFinite(Number(quantity))
      ? Math.max(1, Number(quantity))
      : 1;

    const [result] = await conn.query(
      `INSERT INTO \`ChecklistItem\`
        (room_id, name, quantity, assignee_id, status)
       VALUES (?, ?, ?, ?, 'PENDING')`,
      [checklistId, name, safeQty, safeAssigneeId]
    );

    return result.insertId;
  } finally {
    conn.release();
  }
}

async function updateItemStatus({ checklistId, itemId, isCompleted }) {
  const conn = await pool.getConnection();
  try {
    const status = isCompleted ? "DONE" : "PENDING";
    await conn.query(
      `UPDATE \`ChecklistItem\`
       SET status = ?
       WHERE id = ? AND room_id = ?`,
      [status, itemId, checklistId]
    );
  } finally {
    conn.release();
  }
}

async function removeItem({ checklistId, itemId }) {
  const conn = await pool.getConnection();
  try {
    await conn.query(
      `DELETE FROM \`ChecklistItem\`
       WHERE id = ? AND room_id = ?`,
      [itemId, checklistId]
    );
  } finally {
    conn.release();
  }
}

async function listLocations({ checklistId, userId }) {
  const conn = await pool.getConnection();
  try {
    if (userId != null) {
      const allowed = await isMember({ checklistId, userId });
      if (!allowed) return null;
    }

    const [rows] = await conn.query(
      `SELECT
          id,
          place_name AS name,
          address,
          trip_date AS tripDate,
          sort_order AS sortOrder,
          lat,
          lng,
          kakao_place_id AS kakaoPlaceId,
          created_at AS createdAt
       FROM \`ChecklistLocation\`
       WHERE room_id = ?
       ORDER BY
         (trip_date IS NULL) ASC,
         trip_date ASC,
         sort_order ASC,
         id ASC`,
      [checklistId]
    );

    return rows;
  } finally {
    conn.release();
  }
}

async function addLocation({
  checklistId,
  userId,
  name,
  address,
  tripDate,
  sortOrder,
  lat,
  lng,
  kakaoPlaceId,
}) {
  const conn = await pool.getConnection();
  try {
    const allowed = await isMember({ checklistId, userId });
    if (!allowed) return null;

    const safeLat = Number.parseFloat(lat);
    const safeLng = Number.parseFloat(lng);
    if (!Number.isFinite(safeLat) || !Number.isFinite(safeLng)) return null;

    const placeName = String(name || "").trim() || "저장한 위치";
    const placeAddress = String(address || "").trim() || null;
    const placeId = String(kakaoPlaceId || "").trim() || null;
    const safeTripDate = String(tripDate || "").trim() || null;
    const safeSortOrder = Number.isFinite(Number(sortOrder))
      ? Math.max(1, Number(sortOrder))
      : null;

    let nextSortOrder = safeSortOrder;
    if (nextSortOrder == null) {
      const [[row]] = await conn.query(
        `SELECT COALESCE(MAX(sort_order), 0) AS maxOrder
         FROM \`ChecklistLocation\`
         WHERE room_id = ? AND (
           (trip_date IS NULL AND ? IS NULL) OR trip_date = ?
         )`,
        [checklistId, safeTripDate, safeTripDate]
      );
      nextSortOrder = Number(row?.maxOrder || 0) + 1;
    }

    const [result] = await conn.query(
      `INSERT INTO \`ChecklistLocation\`
        (room_id, created_by, place_name, address, trip_date, sort_order, lat, lng, kakao_place_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        checklistId,
        userId,
        placeName,
        placeAddress,
        safeTripDate,
        nextSortOrder,
        safeLat,
        safeLng,
        placeId,
      ]
    );

    return result.insertId;
  } finally {
    conn.release();
  }
}

async function removeLocation({ checklistId, userId, locationId }) {
  const conn = await pool.getConnection();
  try {
    const allowed = await isMember({ checklistId, userId });
    if (!allowed) return false;

    const [result] = await conn.query(
      `DELETE FROM \`ChecklistLocation\`
       WHERE id = ? AND room_id = ?`,
      [locationId, checklistId]
    );

    return result.affectedRows > 0;
  } finally {
    conn.release();
  }
}

async function clearLocations({ checklistId, userId }) {
  const conn = await pool.getConnection();
  try {
    const allowed = await isMember({ checklistId, userId });
    if (!allowed) return false;

    await conn.query(
      `DELETE FROM \`ChecklistLocation\`
       WHERE room_id = ?`,
      [checklistId]
    );

    return true;
  } finally {
    conn.release();
  }
}

async function reorderLocations({ checklistId, userId, tripDate, orderedIds }) {
  const conn = await pool.getConnection();
  try {
    const allowed = await isMember({ checklistId, userId });
    if (!allowed) return false;

    const ids = Array.isArray(orderedIds)
      ? orderedIds.map((v) => Number(v)).filter((v) => Number.isFinite(v))
      : [];
    if (ids.length === 0) return true;

    const safeTripDate = String(tripDate || "").trim() || null;

    const caseParts = [];
    const params = [];
    ids.forEach((id, idx) => {
      caseParts.push("WHEN ? THEN ?");
      params.push(id, idx + 1);
    });

    const inList = ids.map(() => "?").join(",");
    const sql = `
      UPDATE \`ChecklistLocation\`
      SET
        sort_order = CASE id ${caseParts.join(" ")} ELSE sort_order END,
        trip_date = ?
      WHERE room_id = ? AND id IN (${inList})
    `;

    await conn.query(sql, [...params, safeTripDate, checklistId, ...ids]);
    return true;
  } finally {
    conn.release();
  }
}

module.exports = {
  list,
  create,
  joinByInviteCode,
  detail,
  isMember,
  addItem,
  updateItemStatus,
  removeItem,
  listLocations,
  addLocation,
  removeLocation,
  clearLocations,
  reorderLocations,
};
