const { pool } = require("../../config/db");

async function listChecklist({ roomId }) {
  const [rows] = await pool.query(
    `SELECT
        i.id,
        i.category,
        i.name,
        i.quantity,
        i.assignee_id AS assignedUserId,
        u.nickname AS assignedUserNickname,
        (i.status = 'DONE') AS isDone,
        i.version,
        i.created_at AS createdAt,
        i.updated_at AS updatedAt
     FROM \`ChecklistItem\` i
     LEFT JOIN \`User\` u ON u.id = i.assignee_id
     WHERE i.room_id = ?
     ORDER BY i.id ASC`,
    [roomId]
  );
  return rows;
}

async function createChecklistItem({
  roomId,
  category,
  name,
  quantity,
  assignedUserId,
}) {
  const [result] = await pool.query(
    `INSERT INTO \`ChecklistItem\`
      (room_id, category, name, quantity, assignee_id, status)
     VALUES (?, ?, ?, ?, ?, 'PENDING')`,
    [roomId, category ?? null, name, quantity, assignedUserId ?? null]
  );
  return result.insertId;
}

async function patchChecklistItem({
  roomId,
  itemId,
  expectedVersion,
  patch,
}) {
  const fields = [];
  const values = [];

  if (Object.prototype.hasOwnProperty.call(patch, "category")) {
    fields.push("category = ?");
    values.push(patch.category ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "name")) {
    fields.push("name = ?");
    values.push(patch.name);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "quantity")) {
    fields.push("quantity = ?");
    values.push(patch.quantity);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "assignedUserId")) {
    fields.push("assignee_id = ?");
    values.push(patch.assignedUserId ?? null);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "isDone")) {
    fields.push("status = ?");
    values.push(patch.isDone ? "DONE" : "PENDING");
  }

  if (fields.length === 0) return { ok: true, changed: false };

  values.push(roomId, itemId, expectedVersion);

  const [result] = await pool.query(
    `UPDATE \`ChecklistItem\`
     SET ${fields.join(", ")},
         version = version + 1
     WHERE room_id = ? AND id = ? AND version = ?`,
    values
  );

  if (result.affectedRows === 0) return { ok: false, code: "VERSION_CONFLICT" };
  return { ok: true, changed: true };
}

async function deleteChecklistItem({ roomId, itemId }) {
  const [result] = await pool.query(
    `DELETE FROM \`ChecklistItem\`
     WHERE room_id = ? AND id = ?`,
    [roomId, itemId]
  );
  return result.affectedRows > 0;
}

module.exports = {
  listChecklist,
  createChecklistItem,
  patchChecklistItem,
  deleteChecklistItem,
};

