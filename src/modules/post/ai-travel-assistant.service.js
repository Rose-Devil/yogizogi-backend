// AI 여행 비서 서비스
// 게시글을 분석하여 여행 정보, 일정, 코디 등을 추출

const OpenAI = require("openai");
const { config } = require("../../config/env");

class AITravelAssistantService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey || process.env.OPENAI_API_KEY,
    });
  }

  /**
   * 게시글 통합 분석 (여행글 판단, 일정 요약, 코디 제안)
   * @param {string} title - 게시글 제목
   * @param {string} content - 게시글 내용
   * @param {string} region - 여행 지역
   * @param {string} startDate - 여행 시작일 (YYYY-MM-DD)
   * @param {string} endDate - 여행 종료일 (YYYY-MM-DD)
   * @returns {Promise<object>} AI 분석 결과
   */
  async analyzePost(title, content, region, startDate, endDate) {
    try {
      if (!this.openai.apiKey) {
        console.warn("⚠️ OpenAI API key not configured, skipping AI analysis");
        return null;
      }

      const systemPrompt = `당신은 여행 전문 AI 비서입니다. 사용자의 여행기를 분석하여 다음 JSON 형식으로 응답해주세요:

{
  "is_travel": true 또는 false,
  "timeline": [
    {
      "day": 1,
      "place": "장소명",
      "type": "restaurant" 또는 "cafe" 또는 "attraction" 또는 "other",
      "review": "AI 한 줄 맛평 또는 설명 (맛집/카페인 경우 필수)"
    }
  ],
  "outfit": {
    "recommendations": ["구체적인 옷차림 1", "구체적인 옷차림 2"],
    "essentials": ["필수 준비물 1", "필수 준비물 2"]
  },
  "summary": "일상글인 경우에만 한 줄 요약 (is_travel이 false일 때)"
}

중요 규칙:
- is_travel: 여행 정보성 글(장소, 일정, 맛집 등이 구체적으로 언급)이면 true, 단순 일기나 일상글은 false
- timeline: 본문에서 방문한 장소를 순서대로 추출. 맛집/카페는 반드시 "AI 한 줄 맛평"을 review에 포함 (예: "바삭한 닭강정과 호떡 투어 필수!")
- outfit: 지역과 시기(날짜)를 고려하여 구체적인 코디 제안 (예: "경량 패딩", "두툼한 양말")
- summary: is_travel이 false일 때만 제공 (예: "오늘은 강남역에서 친구와 즐거운 점심을 보낸 하루였네요! ✨")
- 반드시 유효한 JSON 형식으로만 응답 (설명이나 추가 텍스트 없이)`;

      const userMessage = `제목: ${title}

지역: ${region}
여행 기간: ${startDate ? startDate : "미지정"} ~ ${endDate ? endDate : "미지정"}

내용:
${content}

위 게시글을 분석하여 JSON 형식으로 응답해주세요.`;

      console.log("🤖 AI 여행 비서 분석 시작...");

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" }, // JSON 형식 강제
      });

      const resultText = response.choices[0].message.content.trim();
      console.log("✅ AI 분석 완료:", resultText);

      // JSON 파싱
      let result;
      try {
        result = JSON.parse(resultText);
      } catch (parseError) {
        console.error("❌ JSON 파싱 실패:", parseError);
        // JSON 파싱 실패 시 기본값 반환
        result = {
          is_travel: false,
          timeline: [],
          outfit: { recommendations: [], essentials: [] },
          summary: "AI 분석에 실패했습니다.",
        };
      }

      return result;
    } catch (error) {
      console.error("❌ AI 여행 비서 분석 실패:", error.message);
      // 에러 발생 시에도 게시글 작성은 허용
      return null;
    }
  }
}

const aiTravelAssistantService = new AITravelAssistantService();
module.exports = aiTravelAssistantService;

