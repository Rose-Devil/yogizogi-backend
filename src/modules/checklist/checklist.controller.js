const checklistService = require("./checklist.service")

async function list(req, res, next) {
  try {
    const items = await checklistService.list(req.id)
    return res.json({ items })
  } catch (err) {
    return next(err)
  }
}

async function create(req, res, next) {
  const title = (req.body?.title || "").trim()
  const description = (req.body?.description || "").trim()

  if (!title) {
    return res.status(400).json({ message: "제목은 필수입니다." })
  }

  try {
    const id = await checklistService.create({
      userId: req.id,
      title,
      description: description || null,
    })
    return res.status(201).json({ id })
  } catch (err) {
    return next(err)
  }
}

async function detail(req, res, next) {
  try {
    const data = await checklistService.detail({ id: req.params.id })
    if (!data) {
      return res.status(404).json({ message: "체크리스트를 찾을 수 없습니다." })
    }
    return res.json(data)
  } catch (err) {
    return next(err)
  }
}

async function addItem(req, res, next) {
  const name = (req.body?.name || "").trim()
  const assignedTo = (req.body?.assignedTo || "").trim() || null
  const quantity = Number.parseInt(req.body?.quantity, 10) || 1

  if (!name) {
    return res.status(400).json({ message: "항목 이름은 필수입니다." })
  }

  try {
    const id = await checklistService.addItem({
      checklistId: req.params.id,
      name,
      assignedTo,
      quantity: Math.max(1, quantity),
    })
    return res.status(201).json({ id })
  } catch (err) {
    return next(err)
  }
}

async function updateItemStatus(req, res, next) {
  const isCompleted = Boolean(req.body?.isCompleted)

  try {
    await checklistService.updateItemStatus({
      checklistId: req.params.id,
      itemId: req.params.itemId,
      isCompleted,
    })
    return res.status(204).end()
  } catch (err) {
    return next(err)
  }
}

async function removeItem(req, res, next) {
  try {
    await checklistService.removeItem({
      checklistId: req.params.id,
      itemId: req.params.itemId,
    })
    return res.status(204).end()
  } catch (err) {
    return next(err)
  }
}

module.exports = {
  list,
  create,
  detail,
  addItem,
  updateItemStatus,
  removeItem,
}

