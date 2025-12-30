const { pool } = require("../../config/db");

async function findRoomById(id) {
  const [rows] = await pool.query(
    `SELECT id, owner_id AS ownerId, invite_code AS inviteCode
     FROM \`ChecklistRoom\`
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findRoomByInviteCode(inviteCode) {
  const [rows] = await pool.query(
    `SELECT id, owner_id AS ownerId, invite_code AS inviteCode
     FROM \`ChecklistRoom\`
     WHERE invite_code = ?
     LIMIT 1`,
    [inviteCode]
  );
  return rows[0] || null;
}

async function isMember({ roomId, userId }) {
  const [rows] = await pool.query(
    `SELECT 1
     FROM \`ChecklistMember\`
     WHERE room_id = ? AND user_id = ?
     LIMIT 1`,
    [roomId, userId]
  );
  return rows.length > 0;
}

async function upsertMember({ roomId, userId, role = "MEMBER" }) {
  await pool.query(
    `INSERT INTO \`ChecklistMember\` (room_id, user_id, role)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       role = CASE WHEN role = 'OWNER' THEN 'OWNER' ELSE VALUES(role) END`,
    [roomId, userId, role]
  );
}

async function listRoomsForUser(userId) {
  const [rows] = await pool.query(
    `SELECT
        r.id,
        r.name AS title,
        r.description,
        r.created_at AS createdAt,
        (SELECT COUNT(*) FROM \`ChecklistItem\` i WHERE i.room_id = r.id) AS itemCount,
        (SELECT COUNT(*) FROM \`ChecklistMember\` m WHERE m.room_id = r.id) AS members
     FROM \`ChecklistRoom\` r
     INNER JOIN \`ChecklistMember\` my ON my.room_id = r.id AND my.user_id = ?
     ORDER BY r.created_at DESC`,
    [userId]
  );
  return rows;
}

module.exports = {
  findRoomById,
  findRoomByInviteCode,
  isMember,
  upsertMember,
  listRoomsForUser,
};
