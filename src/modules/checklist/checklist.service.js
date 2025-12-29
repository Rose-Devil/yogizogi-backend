const { pool } = require("../../config/db");
const crypto = require("crypto");

// 초대코드 생성 (UNIQUE 충돌 가능성 낮지만, 충돌 시 재시도)
function generateInviteCode() {
  return crypto.randomBytes(8).toString("hex"); // 16 chars
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
          (SELECT COUNT(*) FROM \`ChecklistItem\` i WHERE i.room_id = r.id) AS itemCount,
          (SELECT COUNT(*) FROM \`ChecklistMember\` m WHERE m.room_id = r.id) AS members
       FROM \`ChecklistRoom\` r
       WHERE r.owner_id = ?
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

    return insertId;
  } finally {
    conn.release();
  }
}

async function detail({ id }) {
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
       LEFT JOIN users u ON u.id = i.assignee_id
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
       LEFT JOIN users u ON u.id = m.user_id
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
    // assignedTo가 숫자(userId)로 오면 assignee_id로 저장, 아니면 NULL
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

module.exports = {
  list,
  create,
  detail,
  addItem,
  updateItemStatus,
  removeItem,
};
