const { pool } = require("../../config/db");

async function list(userId) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT c.id, c.title, c.description, c.created_at AS createdAt,
              (SELECT COUNT(*) FROM checklist_items ci WHERE ci.checklist_id = c.id) AS itemCount
       FROM checklists c
       WHERE c.owner_id = ?
       ORDER BY c.created_at DESC`,
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
    const [result] = await conn.query(
      "INSERT INTO checklists (title, description, owner_id, created_at) VALUES (?, ?, ?, NOW())",
      [title, description ?? null, userId]
    );
    await conn.query(
      "INSERT INTO checklist_members (checklist_id, user_id, role) VALUES (?, ?, ?)",
      [result.insertId, userId, "owner"]
    );
    return result.insertId;
  } finally {
    conn.release();
  }
}

async function detail({ id }) {
  const conn = await pool.getConnection();
  try {
    const [[checklist]] = await conn.query(
      "SELECT id, title, description, created_at AS createdAt FROM checklists WHERE id = ?",
      [id]
    );
    if (!checklist) return null;

    const [items] = await conn.query(
      "SELECT id, name, assigned_to AS assignedTo, quantity, is_completed AS isCompleted FROM checklist_items WHERE checklist_id = ? ORDER BY id",
      [id]
    );
    const [members] = await conn.query(
      `SELECT cm.id, u.nickname AS name, cm.role 
       FROM checklist_members cm 
       LEFT JOIN users u ON u.id = cm.user_id 
       WHERE cm.checklist_id = ?`,
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
    const [result] = await conn.query(
      "INSERT INTO checklist_items (checklist_id, name, assigned_to, quantity, is_completed) VALUES (?, ?, ?, ?, false)",
      [checklistId, name, assignedTo ?? null, quantity ?? 1]
    );
    return result.insertId;
  } finally {
    conn.release();
  }
}

async function updateItemStatus({ checklistId, itemId, isCompleted }) {
  const conn = await pool.getConnection();
  try {
    await conn.query(
      "UPDATE checklist_items SET is_completed = ? WHERE id = ? AND checklist_id = ?",
      [Boolean(isCompleted), itemId, checklistId]
    );
  } finally {
    conn.release();
  }
}

async function removeItem({ checklistId, itemId }) {
  const conn = await pool.getConnection();
  try {
    await conn.query(
      "DELETE FROM checklist_items WHERE id = ? AND checklist_id = ?",
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

