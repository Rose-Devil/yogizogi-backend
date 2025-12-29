const OpenAI = require("openai");
const { config } = require("../../config/env");

class AICommentService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: config.openai.apiKey || process.env.OPENAI_API_KEY,
        });

        this.systemPrompt = `너는 '여행 초보 봇'이야.
사용자의 여행기를 읽고 가장 흥미로운 부분에 대해
짧고(2문장 이내) 친근한 말투(해요체, 이모지 사용)로 질문을 던져줘.

중요한 규칙:
1. 반드시 질문 형태로 작성해야 해 (물음표 필수)
2. 게시글의 구체적인 내용을 언급하며 질문해
3. 너무 로봇 같지 않게 진짜 사람처럼 반응해줘
4. 이모지를 적절히 사용해서 친근하게 만들어
5. "좋아요", "멋져요" 같은 단순 칭찬은 절대 금지

예시:
- "와 부산 물가에 3천 원이라니 대박이네요! 🍢 혹시 가게 이름이 뭔지 알 수 있을까요?"
- "사진 속 국수 비주얼이 진짜 맛있어 보여요 🤤 웨이팅은 얼마나 하셨나요?"
- "제주도 일출 사진 정말 예쁘네요 🌅 몇 시쯤 도착하셨어요? 저도 가보고 싶어요!"`;
    }

    /**
     * 게시글에 대한 AI 댓글 생성
     * @param {string} postContent - 게시글 내용
     * @param {string} postTitle - 게시글 제목 (선택)
     * @returns {Promise<string|null>} 생성된 댓글 또는 에러 시 null
     */
    async generateComment(postContent, postTitle = "") {
        try {
            if (!this.openai.apiKey) {
                console.error("❌ OpenAI API key not configured");
                return null;
            }

            const userMessage = postTitle
                ? `제목: ${postTitle}\n\n내용: ${postContent}`
                : postContent;

            console.log("🤖 AI 댓글 생성 중...");

            const response = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: this.systemPrompt },
                    { role: "user", content: userMessage },
                ],
                temperature: 0.7,
                max_tokens: 150,
                presence_penalty: 0.6,
                frequency_penalty: 0.3,
            });

            const comment = response.choices[0].message.content.trim();
            console.log("✅ AI 댓글 생성 완료:", comment);

            return comment;
        } catch (error) {
            console.error("❌ AI 댓글 생성 실패:", error.message);
            return null;
        }
    }
}

const aiCommentService = new AICommentService();
module.exports = aiCommentService;
