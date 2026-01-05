// 콘텐츠 검열 서비스 (OpenAI Moderation API 사용)

const OpenAI = require("openai");
const { config } = require("../../config/env");

class ContentModerationService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey || process.env.OPENAI_API_KEY,
    });

    // 검열 임계값 설정 (0.0 ~ 1.0)
    // 낮을수록 엄격 (더 많은 내용이 차단됨)
    // 높을수록 관대 (명확한 부적절한 내용만 차단)
    // 중간 수위: 쌍욕 같은 명확한 부적절한 표현은 차단하되, 경미한 표현은 허용
    this.thresholds = {
      hate: 0.4, // 혐오 표현 (중간 수위)
      harassment: 0.4, // 괴롭힘 (중간 수위)
      self_harm: 0.3, // 자해 (엄격)
      sexual: 0.3, // 성적 표현 (엄격)
      violence: 0.3, // 폭력 (엄격)
    };

    // 검열 제외 단어 목록 (은어, 특수 용어 등)
    this.whitelist = ["샤갈", "쌰갈", "쌰깔"];

    // 한국어 욕설 블랙리스트 (OpenAI가 감지하지 못하는 한국어 욕설 직접 필터링)
    // 주의: 일반적인 단어가 포함되지 않도록 정확하게 작성
    this.blacklist = [
      "좆",
      "좆같",
      "좆나",
      "존나",
      "존나게",
      "좆되",
      "좆됐",
      "좆망",
      "좆밥",
      "좆만",
      "좆도",
      "시발",
      "씨발",
      "씨바",
      "시바",
      "쉬발",
      "쉬바",
      "개새끼",
      "개새",
      "개쓰레기",
      "개지랄",
      "개병신",
      "개돼지",
      "병신",
      "병신아",
      "병신새끼",
      "지랄",
      "지랄하",
      "지랄했",
      "지랄해",
      "미친",
      "미친놈",
      "미친년",
      "미친새끼",
      "닥쳐",
      "닥치고",
      "엿",
      "엿먹",
      "엿먹어",
      "엿먹고",
      "빠구리",
      "빠가",
      "빠가야로",
      "호로",
      "호로새끼",
      "등신",
      "등신아",
      "쓰레기",
      "쓰레기같",
      "개같",
      "개같은",
      "새끼",
      "새끼야",
      "놈",
      "놈들",
      "ㅈ같네",
      "ㅈ같아",
      "ㅈ같은",
      "ㅈ같은데",
      "tlqkf",
      "ㅅㅂ",
      "ㅅㅂ아",
      "ㅅㅂ새끼",
      "ㅅㅂ놈",
      "ㅅㅂ년",
      "ㅅㅂ들",
      "ㅅㅂ년놈들",
      "씹새끼",
      "씹년",
      "씹년들",
      "씹년놈들",
    ];
  }

  /**
   * 텍스트 검열 (욕설, 비방 등 부적절한 내용 검사)
   * @param {string} text - 검사할 텍스트
   * @returns {Promise<{flagged: boolean, categories?: object, reason?: string}>}
   */
  async moderateText(text) {
    try {
      if (!this.openai.apiKey) {
        console.warn("⚠️ OpenAI API key not configured, skipping moderation");
        return { flagged: false };
      }

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return { flagged: false };
      }

      // 1단계: 한국어 욕설 블랙리스트 직접 검사 (OpenAI보다 먼저)
      const foundBlacklistWords = [];
      for (const word of this.blacklist) {
        // 단어 경계를 고려한 정확한 매칭 (부분 문자열이 아닌 단어 단위)
        const regex = new RegExp(`\\b${word}\\b|${word}`, "gi");
        if (regex.test(text)) {
          foundBlacklistWords.push(word);
        }
      }

      if (foundBlacklistWords.length > 0) {
        console.log("❌ 블랙리스트 욕설 감지:", foundBlacklistWords);
        return {
          flagged: true,
          categories: ["profanity"],
          reason: "부적절한 표현이 포함되어 있습니다",
        };
      }

      // 2단계: 화이트리스트 단어를 임시로 치환 (검열 회피)
      let processedText = text;
      const whitelistMap = {};
      this.whitelist.forEach((word, index) => {
        const placeholder = `__WHITELIST_${index}__`;
        whitelistMap[placeholder] = word;
        // 대소문자 구분 없이 치환
        const regex = new RegExp(word, "gi");
        processedText = processedText.replace(regex, placeholder);
      });

      console.log("🔍 콘텐츠 검열 중...");

      const response = await this.openai.moderations.create({
        input: processedText,
      });

      const result = response.results[0];
      const categoryScores = result.category_scores;

      // OpenAI의 기본 flagged 결과 확인
      const openaiFlagged = result.flagged;

      // 커스텀 임계값으로 재검사 (더 엄격하게 설정 가능)
      let customFlagged = false;
      const flaggedCategories = [];

      // 각 카테고리별 점수가 임계값을 넘는지 확인
      for (const [category, score] of Object.entries(categoryScores)) {
        const threshold = this.thresholds[category] || 0.5;
        if (score > threshold) {
          customFlagged = true;
          flaggedCategories.push(category);
        }
      }

      // OpenAI 기본 검열 또는 커스텀 임계값 중 하나라도 걸리면 차단
      const flagged = openaiFlagged || customFlagged;

      if (flagged) {
        console.log("❌ 부적절한 내용 감지:", {
          openaiFlagged,
          customFlagged,
          flaggedCategories,
          categoryScores,
        });

        // 한국어로 카테고리 이름 매핑
        const categoryNames = {
          hate: "혐오 표현",
          "hate/threatening": "위협적 혐오 표현",
          harassment: "괴롭힘",
          "harassment/threatening": "위협적 괴롭힘",
          self_harm: "자해 관련",
          "self_harm/intent": "자해 의도",
          "self_harm/instructions": "자해 방법",
          sexual: "성적 표현",
          "sexual/minors": "미성년자 대상 성적 표현",
          violence: "폭력",
          "violence/graphic": "생생한 폭력 표현",
        };

        const reason = flaggedCategories
          .map((cat) => categoryNames[cat] || cat)
          .join(", ");

        return {
          flagged: true,
          categories: flaggedCategories,
          categoryScores,
          reason: `부적절한 내용이 감지되었습니다: ${reason}`,
        };
      }

      console.log("✅ 콘텐츠 검열 통과");
      return { flagged: false };
    } catch (error) {
      console.error("❌ 콘텐츠 검열 실패:", error.message);
      // 검열 실패 시에도 게시글 작성은 허용 (에러 로그만 남김)
      return { flagged: false };
    }
  }

  /**
   * 게시글 검열 (제목 + 내용)
   * @param {string} title - 게시글 제목
   * @param {string} content - 게시글 내용
   * @returns {Promise<{flagged: boolean, reason?: string}>}
   */
  async moderatePost(title = "", content = "") {
    // 제목과 내용을 합쳐서 검사
    const combinedText = `${title}\n\n${content}`.trim();

    if (!combinedText) {
      return { flagged: false };
    }

    const result = await this.moderateText(combinedText);

    return result;
  }
}

const contentModerationService = new ContentModerationService();
module.exports = contentModerationService;
