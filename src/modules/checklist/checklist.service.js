const { pool } = require("../../config/db");
const crypto = require("crypto");
const checklistRepository = require("./checklist.repository");
const authRepository = require("../auth/auth.repository");

const { generate6DigitCode, hashOtp } = require("../../common/utils/otp");
const { sendMail } = require("../../common/utils/mailer");
const { config } = require("../../config/env");
const { createTicketToken, verifyToken } = require("../../common/utils/jwt");

function generateInviteCode() {
  return crypto.randomBytes(8).toString("hex"); // 16 chars
}

function getJoinOtpPurpose({ roomId, inviteCode }) {
  return `checklist_join:${roomId}:${inviteCode}`;
}

async function requireRoomMember({ checklistId, userId }) {
  const room = await checklistRepository.findRoomById(checklistId);
  if (!room) throw { statusCode: 404, message: "체크리스트를 찾을 수 없습니다." };

  const ok = await checklistRepository.isMember({ roomId: checklistId, userId });
  if (!ok) throw { statusCode: 403, message: "체크리스트에 접근할 권한이 없습니다." };

  return room;
}

async function list(userId) {
  return checklistRepository.listRoomsForUser(userId);
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
      throw new Error("Failed to create room: invite_code collision retries exceeded.");
    }

    await conn.query(
      `INSERT INTO \`ChecklistMember\` (room_id, user_id, role)
       VALUES (?, ?, 'OWNER')
       ON DUPLICATE KEY UPDATE role = 'OWNER'`,
      [insertId, userId]
    );

    return { id: insertId, inviteCode };
  } finally {
    conn.release();
  }
}

async function getInvite({ checklistId, userId }) {
  const room = await requireRoomMember({ checklistId, userId });
  return { inviteCode: room.inviteCode };
}

async function requestJoinOtp({ userId, inviteCode }) {
  const room = await checklistRepository.findRoomByInviteCode(inviteCode);
  if (!room) throw { statusCode: 404, message: "유효하지 않은 초대코드입니다." };

  const already = await checklistRepository.isMember({ roomId: room.id, userId });
  if (already) {
    return { message: "이미 참여한 체크리스트입니다." };
  }

  const user = await authRepository.findById(userId);
  if (!user?.email) throw { statusCode: 401, message: "사용자 정보를 확인할 수 없습니다." };

  const code = generate6DigitCode();
  const secret = config.otp?.secret || process.env.OTP_SECRET;
  const expiresMin = Number(config.otp?.expiresMin || process.env.OTP_EXPIRES_MIN || 10);
  if (!secret) throw { statusCode: 500, message: "OTP 설정이 필요합니다." };

  const purpose = getJoinOtpPurpose({ roomId: room.id, inviteCode });
  const codeHash = hashOtp({ email: user.email, purpose, code, secret });
  const expiresAt = new Date(Date.now() + expiresMin * 60 * 1000);

  await authRepository.createEmailOtp({ email: user.email, purpose, codeHash, expiresAt });

  await sendMail({
    to: user.email,
    subject: "[YogiZogi] 체크리스트 참여 인증 코드",
    text: `인증 코드는 ${code} 입니다. (${expiresMin}분 내 입력)`,
  });

  return { message: "인증 코드를 이메일로 전송했습니다." };
}

async function verifyJoinOtp({ userId, inviteCode, code }) {
  const room = await checklistRepository.findRoomByInviteCode(inviteCode);
  if (!room) throw { statusCode: 404, message: "유효하지 않은 초대코드입니다." };

  const already = await checklistRepository.isMember({ roomId: room.id, userId });
  if (already) {
    return { ticket: null, message: "이미 참여한 체크리스트입니다." };
  }

  const user = await authRepository.findById(userId);
  if (!user?.email) throw { statusCode: 401, message: "사용자 정보를 확인할 수 없습니다." };

  const purpose = getJoinOtpPurpose({ roomId: room.id, inviteCode });
  const row = await authRepository.findLatestOtp({ email: user.email, purpose });
  if (!row) throw { statusCode: 400, message: "인증 코드를 먼저 요청해주세요." };

  const maxTries = Number(config.otp?.maxTries || process.env.OTP_MAX_TRIES || 5);
  const secret = config.otp?.secret || process.env.OTP_SECRET;
  if (!secret) throw { statusCode: 500, message: "OTP 설정이 필요합니다." };

  if (row.isUsed) throw { statusCode: 400, message: "이미 사용된 코드입니다." };
  if (row.tries >= maxTries) throw { statusCode: 429, message: "시도 횟수 초과. 다시 요청해주세요." };
  if (new Date(row.expiresAt).getTime() < Date.now()) throw { statusCode: 400, message: "코드가 만료되었습니다." };

  const expected = hashOtp({ email: user.email, purpose, code, secret });
  if (expected !== row.codeHash) {
    await authRepository.bumpOtpTries(row.id);
    throw { statusCode: 400, message: "인증 코드가 올바르지 않습니다." };
  }

  await authRepository.markOtpUsed(row.id);

  const ticket = createTicketToken({
    email: user.email,
    typ: "checklist_join_ticket",
    roomId: room.id,
    ttlSeconds: 15 * 60,
  });

  return { ticket };
}

async function joinByInvite({ userId, inviteCode, ticket }) {
  const room = await checklistRepository.findRoomByInviteCode(inviteCode);
  if (!room) throw { statusCode: 404, message: "유효하지 않은 초대코드입니다." };

  const user = await authRepository.findById(userId);
  if (!user?.email) throw { statusCode: 401, message: "사용자 정보를 확인할 수 없습니다." };

  if (!ticket) throw { statusCode: 400, message: "참여 인증이 필요합니다." };

  let decoded;
  try {
    decoded = verifyToken(ticket);
  } catch (e) {
    throw { statusCode: 401, message: "참여 티켓이 만료되었거나 유효하지 않습니다." };
  }

  if (
    decoded?.typ !== "checklist_join_ticket" ||
    decoded?.email !== user.email ||
    Number(decoded?.roomId) !== Number(room.id)
  ) {
    throw { statusCode: 401, message: "참여 티켓이 유효하지 않습니다." };
  }

  await checklistRepository.upsertMember({ roomId: room.id, userId, role: "MEMBER" });

  return { checklistId: room.id };
}

async function detail({ id, userId }) {
  await requireRoomMember({ checklistId: id, userId });
  const conn = await pool.getConnection();
  try {
    const [[checklist]] = await conn.query(
      `SELECT 
          id,
          name AS title,
          description,
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

async function addItem({ checklistId, userId, name, assignedTo, quantity }) {
  await requireRoomMember({ checklistId, userId });
  const conn = await pool.getConnection();
  try {
    const assigneeId =
      assignedTo !== undefined && assignedTo !== null && String(assignedTo).trim() !== ""
        ? Number(assignedTo)
        : null;

    const safeAssigneeId = Number.isFinite(assigneeId) ? assigneeId : null;
    const safeQty = Number.isFinite(Number(quantity)) ? Math.max(1, Number(quantity)) : 1;

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

async function updateItemStatus({ checklistId, userId, itemId, isCompleted }) {
  await requireRoomMember({ checklistId, userId });
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

async function removeItem({ checklistId, userId, itemId }) {
  await requireRoomMember({ checklistId, userId });
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

module.exports = {
  list,
  create,
  getInvite,
  requestJoinOtp,
  verifyJoinOtp,
  joinByInvite,
  detail,
  addItem,
  updateItemStatus,
  removeItem,
};
