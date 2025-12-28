// 피드 컨트롤러

const feedService = require("./feed.service");

async function list(req, res, next) {
  try {
    const limit = Number.parseInt(req.query.limit ?? "20", 10);
    const offset = Number.parseInt(req.query.offset ?? "0", 10);
    const result = await feedService.getFeed({ limit, offset });
    return res.status(200).json(result);
  } catch (e) {
    next(e);
  }
}

module.exports = { list };
