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
  if (!room)
    throw { statusCode: 404, message: "체크리스트를 찾을 수 없습니다." };

  const ok = await checklistRepository.isMember({
    roomId: checklistId,
    userId,
  });
  if (!ok)
    throw { statusCode: 403, message: "체크리스트에 접근할 권한이 없습니다." };

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
  if (!room)
    throw { statusCode: 404, message: "유효하지 않은 초대코드입니다." };

  const already = await checklistRepository.isMember({
    roomId: room.id,
    userId,
  });
  if (already) {
    return { message: "이미 참여한 체크리스트입니다." };
  }

  const user = await authRepository.findById(userId);
  if (!user?.email)
    throw { statusCode: 401, message: "사용자 정보를 확인할 수 없습니다." };

  const code = generate6DigitCode();
  const secret = config.otp?.secret || process.env.OTP_SECRET;
  const expiresMin = Number(
    config.otp?.expiresMin || process.env.OTP_EXPIRES_MIN || 10
  );
  if (!secret) throw { statusCode: 500, message: "OTP 설정이 필요합니다." };

  const purpose = getJoinOtpPurpose({ roomId: room.id, inviteCode });
  const codeHash = hashOtp({ email: user.email, purpose, code, secret });
  const expiresAt = new Date(Date.now() + expiresMin * 60 * 1000);

  await authRepository.createEmailOtp({
    email: user.email,
    purpose,
    codeHash,
    expiresAt,
  });

  await sendMail({
    to: user.email,
    subject: "[YogiZogi] 체크리스트 참여 인증 코드",
    text: `인증 코드는 ${code} 입니다. (${expiresMin}분 내 입력)`,
  });

  return { message: "인증 코드를 이메일로 전송했습니다." };
}

async function verifyJoinOtp({ userId, inviteCode, code }) {
  const room = await checklistRepository.findRoomByInviteCode(inviteCode);
  if (!room)
    throw { statusCode: 404, message: "유효하지 않은 초대코드입니다." };

  const already = await checklistRepository.isMember({
    roomId: room.id,
    userId,
  });
  if (already) {
    return { ticket: null, message: "이미 참여한 체크리스트입니다." };
  }

  const user = await authRepository.findById(userId);
  if (!user?.email)
    throw { statusCode: 401, message: "사용자 정보를 확인할 수 없습니다." };

  const purpose = getJoinOtpPurpose({ roomId: room.id, inviteCode });
  const row = await authRepository.findLatestOtp({
    email: user.email,
    purpose,
  });
  if (!row)
    throw { statusCode: 400, message: "인증 코드를 먼저 요청해주세요." };

  const maxTries = Number(
    config.otp?.maxTries || process.env.OTP_MAX_TRIES || 5
  );
  const secret = config.otp?.secret || process.env.OTP_SECRET;
  if (!secret) throw { statusCode: 500, message: "OTP 설정이 필요합니다." };

  if (row.isUsed) throw { statusCode: 400, message: "이미 사용된 코드입니다." };
  if (row.tries >= maxTries)
    throw { statusCode: 429, message: "시도 횟수 초과. 다시 요청해주세요." };
  if (new Date(row.expiresAt).getTime() < Date.now())
    throw { statusCode: 400, message: "코드가 만료되었습니다." };

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
  if (!room)
    throw { statusCode: 404, message: "유효하지 않은 초대코드입니다." };

  const user = await authRepository.findById(userId);
  if (!user?.email)
    throw { statusCode: 401, message: "사용자 정보를 확인할 수 없습니다." };

  if (!ticket) throw { statusCode: 400, message: "참여 인증이 필요합니다." };

  let decoded;
  try {
    decoded = verifyToken(ticket);
  } catch (e) {
    throw {
      statusCode: 401,
      message: "참여 티켓이 만료되었거나 유효하지 않습니다.",
    };
  }

  if (
    decoded?.typ !== "checklist_join_ticket" ||
    decoded?.email !== user.email ||
    Number(decoded?.roomId) !== Number(room.id)
  ) {
    throw { statusCode: 401, message: "참여 티켓이 유효하지 않습니다." };
  }

  await checklistRepository.upsertMember({
    roomId: room.id,
    userId,
    role: "MEMBER",
  });

  return { checklistId: room.id };
}

async function detail({ id, userId }) {
  await requireRoomMember({ checklistId: id, userId });
  const conn = await pool.getConnection();
  try {
    const [[checklist]] = await conn.query(
      `SELECT 
          r.id,
          r.name AS title,
          r.description,
          r.created_at AS createdAt,
          r.invite_code AS inviteCode,
          m.role AS myRole
       FROM \`ChecklistRoom\` r
       INNER JOIN \`ChecklistMember\` m ON m.room_id = r.id AND m.user_id = ?
       WHERE r.id = ?`,
      [userId, id]
    );
    if (!checklist) return null;

    if (checklist.myRole !== "OWNER") {
      checklist.inviteCode = null;
    }

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
          m.user_id AS userId,
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

    return { ok: true, id: result.insertId };
  } finally {
    conn.release();
  }
}

async function updateItemStatus({ checklistId, userId, itemId, isCompleted }) {
  await requireRoomMember({ checklistId, userId });
  const conn = await pool.getConnection();
  try {
    const role = await getMemberRole(conn, { roomId: checklistId, userId });
    if (!role) return { ok: false, status: 403 };

    const status = isCompleted ? "DONE" : "PENDING";
    await conn.query(
      `UPDATE \`ChecklistItem\`
       SET status = ?
       WHERE id = ? AND room_id = ?`,
      [status, itemId, checklistId]
    );

    return { ok: true };
  } finally {
    conn.release();
  }
}

async function removeItem({ checklistId, userId, itemId }) {
  await requireRoomMember({ checklistId, userId });
  const conn = await pool.getConnection();
  try {
    const role = await getMemberRole(conn, { roomId: checklistId, userId });
    if (!role) return { ok: false, status: 403 };

    await conn.query(
      `DELETE FROM \`ChecklistItem\`
       WHERE id = ? AND room_id = ?`,
      [itemId, checklistId]
    );

    return { ok: true };
  } finally {
    conn.release();
  }
}

async function getInvitePreview({ userId, inviteCode }) {
  const conn = await pool.getConnection();
  try {
    const [[room]] = await conn.query(
      `SELECT id, name AS title, description, owner_id AS ownerId
       FROM \`ChecklistRoom\`
       WHERE invite_code = ?
       LIMIT 1`,
      [inviteCode]
    );

    if (!room) return null;

    const myRole = await getMemberRole(conn, { roomId: room.id, userId });
    return { room, myRole };
  } finally {
    conn.release();
  }
}

async function joinByInviteCode({ userId, inviteCode }) {
  const conn = await pool.getConnection();
  try {
    const [[room]] = await conn.query(
      `SELECT id
       FROM \`ChecklistRoom\`
       WHERE invite_code = ?
       LIMIT 1`,
      [inviteCode]
    );

    if (!room) {
      return {
        ok: false,
        status: 404,
        body: { message: "ì´ˆëŒ€ ì½”ë“œê°€ ?¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤." },
      };
    }

    await conn.query(
      `INSERT INTO \`ChecklistMember\` (room_id, user_id, role)
       VALUES (?, ?, 'MEMBER')
       ON DUPLICATE KEY UPDATE role = role`,
      [room.id, userId]
    );

    return { ok: true, status: 200, body: { id: room.id } };
  } finally {
    conn.release();
  }
}

async function requestJoinOtp({ userId, inviteCode }) {
  const preview = await getInvitePreview({ userId, inviteCode });
  if (!preview) {
    return {
      ok: false,
      status: 404,
      body: { message: "ì´ˆëŒ€ ì½”ë“œê°€ ?¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤." },
    };
  }

  const secret = config.otp?.secret || process.env.OTP_SECRET;
  const expiresMin = Number(
    config.otp?.expiresMin || process.env.OTP_EXPIRES_MIN || 10
  );
  if (!secret) {
    return {
      ok: false,
      status: 500,
      body: { message: "OTP_SECRET???„ìš”?©ë‹ˆ??" },
    };
  }

  const user = await authRepository.findById(userId);
  if (!user?.email) {
    return {
      ok: false,
      status: 400,
      body: { message: "ì?´ë©”?? ì •ë³´ê°€ ?†ìŠµ?ˆë‹¤." },
    };
  }

  const purpose = `checklist_join:${preview.room.id}`;
  const code = generate6DigitCode();
  const codeHash = hashOtp({ email: user.email, purpose, code, secret });
  const expiresAt = new Date(Date.now() + expiresMin * 60 * 1000);

  await authRepository.createEmailOtp({
    email: user.email,
    purpose,
    codeHash,
    expiresAt,
  });

  await sendMail({
    to: user.email,
    subject: "[YogiZogi] ì²´í¬ë¦¬ìŠ¤?¸ ì´ˆëŒ€ ì¸ì¦ ì½”ë“œ",
    text: `ì´ˆëŒ€ ì¸ì¦ ì½”ë“œ??${code} ?…ë‹ˆ?? (${expiresMin}ë¶????…ë ¥)`,
  });

  return {
    ok: true,
    status: 200,
    body: { message: "?¸ì¦ ì½”ë“œë¥??„ì†¡?ˆìŠµ?ˆë‹¤." },
  };
}

async function verifyJoinOtpAndJoin({ userId, inviteCode, code }) {
  const preview = await getInvitePreview({ userId, inviteCode });
  if (!preview) {
    return {
      ok: false,
      status: 404,
      body: { message: "ì´ˆëŒ€ ì½”ë“œê°€ ?¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤." },
    };
  }

  const user = await authRepository.findById(userId);
  if (!user?.email) {
    return {
      ok: false,
      status: 400,
      body: { message: "ì?´ë©”?? ì •ë³´ê°€ ?†ìŠµ?ˆë‹¤." },
    };
  }

  const maxTries = Number(
    config.otp?.maxTries || process.env.OTP_MAX_TRIES || 5
  );
  const secret = config.otp?.secret || process.env.OTP_SECRET;
  const purpose = `checklist_join:${preview.room.id}`;

  const row = await authRepository.findLatestOtp({
    email: user.email,
    purpose,
  });
  if (!row) {
    return {
      ok: false,
      status: 400,
      body: { message: "ì½”ë“œë¥??¤ì‹œ ?”ì²­?´ì£¼?¸ìš”." },
    };
  }

  if (row.isUsed) {
    return {
      ok: false,
      status: 400,
      body: { message: "?´ë? ?¬ìš©??ì½”ë“œ?…ë‹ˆ??" },
    };
  }
  if (row.tries >= maxTries) {
    return {
      ok: false,
      status: 429,
      body: { message: "?œë„ ?Ÿìˆ˜ ì´ˆê³¼. ?¤ì‹œ ?”ì²­?´ì£¼?¸ìš”." },
    };
  }
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    return {
      ok: false,
      status: 400,
      body: { message: "ì½”ë“œê°€ ë§Œë£Œ?˜ì—ˆ?µë‹ˆ??" },
    };
  }

  const expected = hashOtp({ email: user.email, purpose, code, secret });
  if (expected !== row.codeHash) {
    await authRepository.bumpOtpTries(row.id);
    return {
      ok: false,
      status: 400,
      body: { message: "?¸ì¦ ì½”ë“œê°€ ?¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤." },
    };
  }

  await authRepository.markOtpUsed(row.id);
  return joinByInviteCode({ userId, inviteCode });
}

async function leave({ userId, checklistId }) {
  const conn = await pool.getConnection();
  try {
    const role = await getMemberRole(conn, { roomId: checklistId, userId });
    if (!role) {
      return {
        ok: false,
        status: 404,
        body: { message: "ì²´í¬ë¦¬ìŠ¤?¸ì„ ì°¾ì„ ???†ìŠµ?ˆë‹¤." },
      };
    }
    if (role === "OWNER") {
      return {
        ok: false,
        status: 400,
        body: { message: "ë°©ìž¥?€ ?˜ê??œ ìˆ˜ ?†ìŠµ?ˆë‹¤." },
      };
    }

    await conn.query(
      `DELETE FROM \`ChecklistMember\` WHERE room_id = ? AND user_id = ?`,
      [checklistId, userId]
    );

    return { ok: true, status: 204 };
  } finally {
    conn.release();
  }
}

async function getInviteCode({ userId, checklistId }) {
  const conn = await pool.getConnection();
  try {
    const role = await getMemberRole(conn, { roomId: checklistId, userId });
    if (!role) {
      return {
        ok: false,
        status: 404,
        body: { message: "ì²´í¬ë¦¬ìŠ¤?¸ì„ ì°¾ì„ ???†ìŠµ?ˆë‹¤." },
      };
    }
    if (role !== "OWNER") {
      return {
        ok: false,
        status: 403,
        body: { message: "ì ‘ê·¼ ?Œí•œ?´ ?†ìŠµ?ˆë‹¤." },
      };
    }

    const [[row]] = await conn.query(
      `SELECT invite_code AS inviteCode FROM \`ChecklistRoom\` WHERE id = ? LIMIT 1`,
      [checklistId]
    );

    return {
      ok: true,
      status: 200,
      body: { inviteCode: row?.inviteCode ?? null },
    };
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
  getInvitePreview,
  joinByInviteCode,
  requestJoinOtp,
  verifyJoinOtpAndJoin,
  leave,
  getInviteCode,
};
