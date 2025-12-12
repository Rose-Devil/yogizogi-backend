<<<<<<< HEAD
# YogiZogi Backend

여행 기록 공유 플랫폼 백엔드 API 서버

## 프로젝트 구조

```
yogizogi-backend/
├─ src/
│  ├─ app.js                 # Express 앱 설정 (미들웨어, 라우터 연결)
│  ├─ server.js              # 서버 시작 포인트
│  ├─ config/                # 환경변수, DB 연결, 설정
│  ├─ common/                # 공통 유틸 / 미들웨어
│  ├─ modules/               # 도메인(ERD 기준) 별 모듈
│  └─ infra/                 # 외부 연동 (이메일, 파일 업로드 등)
├─ .env.example
├─ package.json
└─ README.md
```

## 설치 및 실행

1. 의존성 설치

```bash
npm install
```

2. 환경변수 설정

```bash
cp .env.example .env
# .env 파일을 열어 필요한 값들을 설정하세요
```

3. 서버 실행

```bash
# 개발 모드
npm run dev

# 프로덕션 모드
npm start
```

## 모듈 설명

- **auth**: 로그인/회원가입/비밀번호 재설정
- **user**: 사용자 프로필 및 설정 관리
- **post**: 여행 게시글 작성 및 관리
- **feed**: 피드 조회 및 검색
- **interaction**: 좋아요, 북마크, 댓글 기능
- **checklist**: 공용 짐 체크리스트
=======
# yogizogi-backend
백엔드 API 서버
>>>>>>> 4a0388f2ede0d314c7fa0458ff9077e086008ad8
