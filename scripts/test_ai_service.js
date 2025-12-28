// scripts/test_ai_service.js
const aiCommentService = require('../src/modules/interaction/ai-comment.service');
const dotenv = require('dotenv');
dotenv.config();

async function testAIService() {
    console.log('🧪 AI 댓글 서비스 테스트 시작...');

    if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OPENAI_API_KEY가 설정되지 않았습니다.');
        return;
    }

    const testPost = {
        title: '제주도 맛집 추천',
        content: '제주도에 가서 흑돼지를 먹었는데 정말 맛있었어요. 특히 멜젓에 찍어먹는 게 일품이네요. 추천합니다!' // 여행 관련 모의 데이터
    };

    try {
        const comment = await aiCommentService.generateComment(testPost.content, testPost.title);
        if (comment) {
            console.log('\n✅ 생성된 AI 댓글:', comment);
        } else {
            console.log('\n❌ AI 댓글 생성 실패 (null 반환)');
        }
    } catch (error) {
        console.error('\n❌ 테스트 중 에러 발생:', error);
    }
}

testAIService();
