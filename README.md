# Yogizogi Backend (`yogizogi-backend`)

요기조기(Yogizogi) 서비스의 **백엔드 서버**입니다.  
Node.js + Express + Sequelize(MySQL) 기반으로 구축되었습니다.

---

## 1. 기술 스택

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL (Sequelize ORM)
- **Authentication**: JWT (Access + Refresh Token)
- **Storage**: AWS S3 (Image Upload)
- **AI**: OpenAI GPT-3.5 (Auto Comment)

---

## 2. 환경 변수 설정 (.env)

프로젝트 루트에 `.env` 파일을 생성하고 아래 내용을 채워주세요.
(참고: `.env.example` 파일)

```env
# Server
PORT=9090
NODE_ENV=development

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=yogizogi

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_SEC=86400

# AWS S3 (이미지 업로드용)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-northeast-2
AWS_BUCKET_NAME=your_bucket_name

# OpenAI (AI 댓글용)
OPENAI_API_KEY=your_openai_key

# AI Comment Settings
MIN_POST_LENGTH=100       # AI 댓글 생성 최소 글자 수
MAX_DAILY_AI_COMMENTS=50  # 하루 최대 생성 댓글 수
AI_COMMENT_DELAY_MS=10000 # 댓글 생성 지연 시간 (ms)
```

---

## 3. 프로젝트 구조

```txt
src/
├─ config/          # 환경변수, DB 설정
├─ common/          # 공통 유틸리티, 미들웨어
│  ├─ middleware/   # authGuard, upload(S3) 등
│  └─ utils/        # jwt, s3, response 등
├─ modules/         # 도메인별 비즈니스 로직
│  ├─ auth/         # 로그인, 회원가입
│  ├─ post/         # 게시글 CRUD
│  ├─ user/         # 사용자 정보
│  └─ interaction/  # 댓글(AI 포함), 좋아요
└─ server.js        # 진입점
```

## 4. 실행 방법

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```
