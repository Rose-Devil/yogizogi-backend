// 광고성 게시글 검열 서비스

class AdvertisementDetectionService {
  constructor() {
    // 광고성 키워드 목록
    this.advertisementKeywords = [
      // 판매/구매 관련
      "구매", "판매", "할인", "특가", "세일", "이벤트", "프로모션", "쿠폰",
      "예약", "예매", "티켓", "투어", "패키지", "상품", "상품권",
      // 광고 문구
      "광고", "협찬", "제공", "무료체험", "무료상담", "문의", "연락",
      "예약문의", "예약하기", "지금예약", "바로가기", "클릭", "링크",
      // 상업적 표현
      "최저가", "최대할인", "무료배송", "무료수령", "사은품", "증정",
      "리뷰이벤트", "리뷰작성", "리뷰어모집", "체험단모집",
      // 연락처/홈페이지
      "홈페이지", "웹사이트", "블로그", "인스타그램", "인스타", "페이스북",
      "카카오톡", "카톡", "전화", "연락처", "문의처", "상담",
      // URL 패턴
      "http://", "https://", "www.", ".com", ".kr", ".net",
      // 상업적 호소
      "지금바로", "오늘만", "한정", "선착순", "마감임박", "마감직전",
      "놓치지마세요", "놓치지마", "기회", "혜택", "추천",
    ];

    // 광고성 패턴 (정규식)
    this.advertisementPatterns = [
      /\d+%?\s*(할인|세일|특가)/gi, // "50% 할인", "30% 세일"
      /(무료|무료로)\s*(체험|상담|배송|수령)/gi, // "무료 체험", "무료 상담"
      /(지금|바로|오늘)\s*(예약|구매|주문)/gi, // "지금 예약", "바로 구매"
      /(최저가|최대할인|특가)/gi,
      /(문의|연락|상담)\s*(주세요|해주세요|바랍니다)/gi,
      /(홈페이지|웹사이트|블로그|인스타|카톡)/gi,
      /(http|https|www\.)/gi, // URL
      /(리뷰|체험단)\s*(이벤트|모집)/gi,
    ];

    // 일반적인 표현 (화이트리스트) - 이런 표현이 있으면 광고 점수를 낮춤
    this.whitelistPatterns = [
      /(댓글|덧글)\s*(남겨|달아|달아주세요|남겨주세요)/gi, // "댓글 남겨주세요"
      /(궁금|질문)\s*(있으시면|있으면|하시면)\s*(댓글|덧글)/gi, // "궁금하시면 댓글"
      /(댓글로|덧글로)\s*(남겨|달아|문의)/gi, // "댓글로 남겨주세요"
      /(정보|추천|추천해주세요|알려주세요)/gi, // 일반적인 정보 요청
    ];
  }

  /**
   * 게시글이 광고성인지 검사
   * @param {string} title - 게시글 제목
   * @param {string} content - 게시글 내용
   * @returns {Promise<{isAdvertisement: boolean, confidence: number, reasons: string[]}>}
   */
  async detectAdvertisement(title = "", content = "") {
    const combinedText = `${title}\n\n${content}`.trim().toLowerCase();

    if (!combinedText) {
      return {
        isAdvertisement: false,
        confidence: 0,
        reasons: [],
      };
    }

    let score = 0;
    const reasons = [];
    const foundKeywords = [];

    // 0단계: 화이트리스트 패턴 확인 (일반적인 표현이 있으면 점수 감소)
    let hasWhitelistPattern = false;
    for (const pattern of this.whitelistPatterns) {
      if (pattern.test(combinedText)) {
        hasWhitelistPattern = true;
        break;
      }
    }

    // 1단계: 키워드 검사
    for (const keyword of this.advertisementKeywords) {
      const regex = new RegExp(keyword, "gi");
      if (regex.test(combinedText)) {
        foundKeywords.push(keyword);
        // 화이트리스트 패턴이 있으면 점수 절반만 추가
        score += hasWhitelistPattern ? 0.5 : 1;
      }
    }

    // 2단계: 패턴 검사
    for (const pattern of this.advertisementPatterns) {
      if (pattern.test(combinedText)) {
        // 화이트리스트 패턴이 있으면 점수 절반만 추가
        const patternScore = hasWhitelistPattern ? 1 : 2;
        score += patternScore;
        if (patternScore >= 2) {
          reasons.push("광고성 패턴 감지");
        }
      }
    }

    // 3단계: URL 포함 여부
    const urlPattern = /(https?:\/\/|www\.)[^\s]+/gi;
    if (urlPattern.test(combinedText)) {
      // URL은 강한 광고 신호이지만, 화이트리스트 패턴이 있으면 점수 감소
      const urlScore = hasWhitelistPattern ? 1.5 : 3;
      score += urlScore;
      reasons.push("URL 포함");
    }

    // 4단계: 연락처 패턴 (전화번호, 이메일 등)
    const phonePattern = /(\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{4})/g;
    const emailPattern = /[\w.-]+@[\w.-]+\.\w+/gi;
    if (phonePattern.test(combinedText) || emailPattern.test(combinedText)) {
      // 연락처도 화이트리스트 패턴이 있으면 점수 감소
      const contactScore = hasWhitelistPattern ? 1 : 2;
      score += contactScore;
      reasons.push("연락처 포함");
    }

    // 5단계: 키워드 밀도 검사
    const keywordDensity = foundKeywords.length / Math.max(combinedText.length / 100, 1);
    if (keywordDensity > 0.1) {
      // 텍스트의 10% 이상이 광고 키워드인 경우
      score += 2;
      reasons.push("광고 키워드 밀도 높음");
    }

    // 점수 기반 판단
    // 화이트리스트 패턴이 있으면 임계값을 더 높게 설정 (일반 게시글일 가능성 높음)
    const threshold = hasWhitelistPattern ? 5 : 3;
    const isAdvertisement = score >= threshold;
    const confidence = Math.min(score / 10, 1); // 0~1 사이의 신뢰도

    if (foundKeywords.length > 0) {
      reasons.push(`광고 키워드: ${foundKeywords.slice(0, 5).join(", ")}${foundKeywords.length > 5 ? "..." : ""}`);
    }

    if (hasWhitelistPattern) {
      reasons.push("일반적인 표현 감지 (점수 조정)");
    }

    console.log(`[광고성 검사] 점수: ${score.toFixed(1)}, 임계값: ${threshold}, 광고 여부: ${isAdvertisement}, 신뢰도: ${(confidence * 100).toFixed(1)}%`);

    return {
      isAdvertisement,
      confidence,
      score,
      reasons: reasons.length > 0 ? reasons : (isAdvertisement ? ["광고성 내용 감지"] : []),
    };
  }

  /**
   * 게시글 검열 (제목 + 내용)
   * @param {string} title - 게시글 제목
   * @param {string} content - 게시글 내용
   * @returns {Promise<{isAdvertisement: boolean, confidence: number, reasons: string[]}>}
   */
  async detectPost(title = "", content = "") {
    return await this.detectAdvertisement(title, content);
  }
}

const advertisementDetectionService = new AdvertisementDetectionService();
module.exports = advertisementDetectionService;

