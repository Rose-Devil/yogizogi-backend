const checklistService = require("./checklist.service");

async function list(req, res, next) {
  try {
    const userId = req.id;
    const items = await checklistService.list(userId);
    return res.status(200).json({ items });
  } catch (e) {
    next(e);
  }
}

async function create(req, res, next) {
  try {
    const userId = req.id;
    const { title, description } = req.body;
    const id = await checklistService.create({ userId, title, description });
    return res.status(201).json({ id });
  } catch (e) {
    next(e);
  }
}

async function detail(req, res, next) {
  try {
    const userId = req.id;
    const id = req.params.id;
    const data = await checklistService.detail({ id, userId });
    if (!data) return res.status(404).json({ message: "checklist not found" });
    return res.status(200).json(data);
  } catch (e) {
    next(e);
  }
}

async function addItem(req, res, next) {
  try {
    const checklistId = req.params.id;
    const { name, assignedTo, quantity = 1 } = req.body;
    const itemId = await checklistService.addItem({
      checklistId,
      name,
      assignedTo,
      quantity,
    });
    return res.status(201).json({ id: itemId });
  } catch (e) {
    next(e);
  }
}

async function updateItemStatus(req, res, next) {
  try {
    const checklistId = req.params.id;
    const itemId = req.params.itemId;
    const { isCompleted } = req.body;
    await checklistService.updateItemStatus({ checklistId, itemId, isCompleted });
    return res.status(200).json({ id: itemId });
  } catch (e) {
    next(e);
  }
}

async function removeItem(req, res, next) {
  try {
    const checklistId = req.params.id;
    const itemId = req.params.itemId;
    await checklistService.removeItem({ checklistId, itemId });
    return res.status(204).end();
  } catch (e) {
    next(e);
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

