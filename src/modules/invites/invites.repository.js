const { pool } = require("../../config/db");

async function createInvite({
  roomId,
  createdBy,
  tokenHash,
  codeHash,
  expiresAt,
  maxUses,
}) {
  const [result] = await pool.query(
    `INSERT INTO \`RoomInvite\`
      (room_id, created_by, token_hash, code_hash, expires_at, max_uses)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [roomId, createdBy, tokenHash, codeHash ?? null, expiresAt, maxUses]
  );
  return result.insertId;
}

async function findActiveInviteByTokenHash(tokenHash) {
  const [rows] = await pool.query(
    `SELECT
        id,
        room_id AS roomId,
        created_by AS createdBy,
        expires_at AS expiresAt,
        max_uses AS maxUses,
        used_count AS usedCount,
        revoked_at AS revokedAt,
        created_at AS createdAt
     FROM \`RoomInvite\`
     WHERE token_hash = ?
     LIMIT 1`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function findActiveInviteByCodeHash(codeHash) {
  const [rows] = await pool.query(
    `SELECT
        id,
        room_id AS roomId,
        created_by AS createdBy,
        expires_at AS expiresAt,
        max_uses AS maxUses,
        used_count AS usedCount,
        revoked_at AS revokedAt,
        created_at AS createdAt
     FROM \`RoomInvite\`
     WHERE code_hash = ?
     LIMIT 1`,
    [codeHash]
  );
  return rows[0] || null;
}

async function revokeInvite({ inviteId, roomId }) {
  const [result] = await pool.query(
    `UPDATE \`RoomInvite\`
     SET revoked_at = COALESCE(revoked_at, current_timestamp(3))
     WHERE id = ? AND room_id = ?`,
    [inviteId, roomId]
  );
  return result.affectedRows > 0;
}

async function acceptInviteTransaction({ inviteId, userId, role = "EDITOR" }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[invite]] = await conn.query(
      `SELECT
          id,
          room_id AS roomId,
          expires_at AS expiresAt,
          max_uses AS maxUses,
          used_count AS usedCount,
          revoked_at AS revokedAt
       FROM \`RoomInvite\`
       WHERE id = ?
       FOR UPDATE`,
      [inviteId]
    );

    if (!invite) {
      throw { statusCode: 404, message: "초대 정보를 찾을 수 없습니다." };
    }
    if (invite.revokedAt) {
      throw { statusCode: 410, message: "폐기된 초대 링크입니다." };
    }
    if (new Date(invite.expiresAt).getTime() < Date.now()) {
      throw { statusCode: 410, message: "만료된 초대 링크입니다." };
    }
    if (Number(invite.usedCount) >= Number(invite.maxUses)) {
      throw { statusCode: 410, message: "사용 횟수를 초과한 초대 링크입니다." };
    }

    const [[existing]] = await conn.query(
      `SELECT 1 AS ok
       FROM \`ChecklistMember\`
       WHERE room_id = ? AND user_id = ?
       LIMIT 1`,
      [invite.roomId, userId]
    );

    if (!existing) {
      await conn.query(
        `INSERT INTO \`ChecklistMember\` (room_id, user_id, role)
         VALUES (?, ?, ?)`,
        [invite.roomId, userId, role]
      );

      await conn.query(
        `UPDATE \`RoomInvite\`
         SET used_count = used_count + 1
         WHERE id = ?`,
        [inviteId]
      );
    }

    await conn.commit();

    return { roomId: invite.roomId, alreadyMember: Boolean(existing) };
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
  createInvite,
  findActiveInviteByTokenHash,
  findActiveInviteByCodeHash,
  revokeInvite,
  acceptInviteTransaction,
};
