const { pool } = require("../../config/db");
const crypto = require("crypto");

async function createRoom({ ownerId, title, description, travelStartDate, travelEndDate }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // legacy field (unique + not null). Not used by the new invite flow.
    const legacyInviteCode = crypto.randomBytes(8).toString("hex");

    const [result] = await conn.query(
      `INSERT INTO \`ChecklistRoom\`
        (owner_id, name, description, travel_start_date, travel_end_date, invite_code)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        ownerId,
        title,
        description ?? null,
        travelStartDate ?? null,
        travelEndDate ?? null,
        legacyInviteCode,
      ]
    );

    const roomId = result.insertId;

    await conn.query(
      `INSERT INTO \`ChecklistMember\` (room_id, user_id, role)
       VALUES (?, ?, 'OWNER')
       ON DUPLICATE KEY UPDATE role = 'OWNER'`,
      [roomId, ownerId]
    );

    await conn.commit();
    return roomId;
  } catch (e) {
    try {
      await conn.rollback();
    } catch {}
    throw e;
  } finally {
    conn.release();
  }
}

async function findRoomById(roomId) {
  const [rows] = await pool.query(
    `SELECT
        id,
        owner_id AS ownerId,
        name AS title,
        description,
        travel_start_date AS travelStartDate,
        travel_end_date AS travelEndDate,
        created_at AS createdAt,
        updated_at AS updatedAt
     FROM \`ChecklistRoom\`
     WHERE id = ?
     LIMIT 1`,
    [roomId]
  );
  return rows[0] || null;
}

async function listRoomsForUser(userId) {
  const [rows] = await pool.query(
    `SELECT
        r.id,
        r.name AS title,
        r.description,
        r.travel_start_date AS travelStartDate,
        r.travel_end_date AS travelEndDate,
        r.created_at AS createdAt,
        my.role AS myRole,
        (SELECT COUNT(*) FROM \`ChecklistMember\` m WHERE m.room_id = r.id) AS memberCount
     FROM \`ChecklistRoom\` r
     INNER JOIN \`ChecklistMember\` my ON my.room_id = r.id AND my.user_id = ?
     ORDER BY r.created_at DESC`,
    [userId]
  );
  return rows;
}

async function getMemberRole({ roomId, userId }) {
  const [rows] = await pool.query(
    `SELECT role
     FROM \`ChecklistMember\`
     WHERE room_id = ? AND user_id = ?
     LIMIT 1`,
    [roomId, userId]
  );
  return rows[0]?.role ?? null;
}

async function upsertMember({ roomId, userId, role }) {
  await pool.query(
    `INSERT INTO \`ChecklistMember\` (room_id, user_id, role)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE role = VALUES(role)`,
    [roomId, userId, role]
  );
}

async function updateMemberRole({ roomId, userId, role }) {
  const [result] = await pool.query(
    `UPDATE \`ChecklistMember\`
     SET role = ?
     WHERE room_id = ? AND user_id = ?`,
    [role, roomId, userId]
  );
  return result.affectedRows > 0;
}

async function listMembers({ roomId }) {
  const [rows] = await pool.query(
    `SELECT
        m.user_id AS userId,
        u.nickname,
        u.profile_image_url AS profileImageUrl,
        m.role,
        m.joined_at AS joinedAt
     FROM \`ChecklistMember\` m
     INNER JOIN \`User\` u ON u.id = m.user_id
     WHERE m.room_id = ?
     ORDER BY FIELD(m.role,'OWNER','EDITOR','VIEWER'), m.joined_at ASC`,
    [roomId]
  );
  return rows;
}

module.exports = {
  createRoom,
  findRoomById,
  listRoomsForUser,
  getMemberRole,
  upsertMember,
  updateMemberRole,
  listMembers,
};
