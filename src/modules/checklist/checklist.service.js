const { pool } = require("../../config/db");
const crypto = require("crypto");
const authRepository = require("../auth/auth.repository");
const { generate6DigitCode, hashOtp } = require("../../common/utils/otp");
const { sendMail } = require("../../common/utils/mailer");
const { config } = require("../../config/env");

// 초대코드 생성 (UNIQUE 충돌 가능성 낮지만, 충돌 시 재시도)
function generateInviteCode() {
  return crypto.randomBytes(8).toString("hex"); // 16 chars
}

async function getMemberRole(conn, { roomId, userId }) {
  const [[row]] = await conn.query(
    `SELECT role
     FROM \`ChecklistMember\`
     WHERE room_id = ? AND user_id = ?
     LIMIT 1`,
    [roomId, userId]
  );
  return row?.role ?? null;
}

async function list(userId) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT 
          r.id,
          r.name AS title,
          r.description,
          r.created_at AS createdAt,
          m.role AS myRole,
          (SELECT COUNT(*) FROM \`ChecklistItem\` i WHERE i.room_id = r.id) AS itemCount,
          (SELECT COUNT(*) FROM \`ChecklistMember\` m WHERE m.room_id = r.id) AS members
       FROM \`ChecklistRoom\` r
       INNER JOIN \`ChecklistMember\` m ON m.room_id = r.id AND m.user_id = ?
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
    // invite_code UNIQUE라서 충돌나면 몇 번 재시도
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
        // 중복이면 재시도
        if (err && err.code === "ER_DUP_ENTRY") continue;
        throw err;
      }
    }

    if (!insertId) {
      throw new Error(
        "Failed to create room: invite_code collision retries exceeded."
      );
    }

    // (선택) 트리거가 방장 OWNER 멤버 자동 생성하지만,
    // 혹시 트리거 없을 때도 대비해서 upsert로 보강 가능
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

async function detail({ id, userId }) {
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

async function addItem({ userId, checklistId, name, assignedTo, quantity }) {
  const conn = await pool.getConnection();
  try {
    // assignedTo가 숫자(userId)로 오면 assignee_id로 저장, 아니면 NULL
    const role = await getMemberRole(conn, { roomId: checklistId, userId });
    if (!role) return { ok: false, status: 403 };

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

async function updateItemStatus({ userId, checklistId, itemId, isCompleted }) {
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

async function removeItem({ userId, checklistId, itemId }) {
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
    return { ok: false, status: 500, body: { message: "OTP_SECRET???„ìš”?©ë‹ˆ??" } };
  }

  const user = await authRepository.findById(userId);
  if (!user?.email) {
    return { ok: false, status: 400, body: { message: "ì?´ë©”?? ì •ë³´ê°€ ?†ìŠµ?ˆë‹¤." } };
  }

  const purpose = `checklist_join:${preview.room.id}`;
  const code = generate6DigitCode();
  const codeHash = hashOtp({ email: user.email, purpose, code, secret });
  const expiresAt = new Date(Date.now() + expiresMin * 60 * 1000);

  await authRepository.createEmailOtp({ email: user.email, purpose, codeHash, expiresAt });

  await sendMail({
    to: user.email,
    subject: "[YogiZogi] ì²´í¬ë¦¬ìŠ¤?¸ ì´ˆëŒ€ ì¸ì¦ ì½”ë“œ",
    text: `ì´ˆëŒ€ ì¸ì¦ ì½”ë“œ??${code} ?…ë‹ˆ?? (${expiresMin}ë¶????…ë ¥)`,
  });

  return { ok: true, status: 200, body: { message: "?¸ì¦ ì½”ë“œë¥??„ì†¡?ˆìŠµ?ˆë‹¤." } };
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
    return { ok: false, status: 400, body: { message: "ì?´ë©”?? ì •ë³´ê°€ ?†ìŠµ?ˆë‹¤." } };
  }

  const maxTries = Number(config.otp?.maxTries || process.env.OTP_MAX_TRIES || 5);
  const secret = config.otp?.secret || process.env.OTP_SECRET;
  const purpose = `checklist_join:${preview.room.id}`;

  const row = await authRepository.findLatestOtp({ email: user.email, purpose });
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
    return { ok: false, status: 400, body: { message: "ì½”ë“œê°€ ë§Œë£Œ?˜ì—ˆ?µë‹ˆ??" } };
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
      return { ok: false, status: 400, body: { message: "ë°©ìž¥?€ ?˜ê??œ ìˆ˜ ?†ìŠµ?ˆë‹¤." } };
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
      return { ok: false, status: 403, body: { message: "ì ‘ê·¼ ?Œí•œ?´ ?†ìŠµ?ˆë‹¤." } };
    }

    const [[row]] = await conn.query(
      `SELECT invite_code AS inviteCode FROM \`ChecklistRoom\` WHERE id = ? LIMIT 1`,
      [checklistId]
    );

    return { ok: true, status: 200, body: { inviteCode: row?.inviteCode ?? null } };
  } finally {
    conn.release();
  }
}

module.exports = {
  list,
  create,
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
