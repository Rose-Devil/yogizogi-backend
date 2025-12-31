const mzService = require("./mz.service");

class MzController {
  async convertText(req, res, next) {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({
          success: false,
          message: "변환할 텍스트가 필요합니다.",
        });
      }

      const convertedText = await mzService.convertText(text);

      if (!convertedText) {
        return res.status(500).json({
          success: false,
          message: "MZ 스타일 변환에 실패했습니다.",
        });
      }

      res.json({
        success: true,
        data: {
          original: text,
          converted: convertedText,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

const mzController = new MzController();
module.exports = mzController;
