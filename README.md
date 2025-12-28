# Yogizogi Backend (`yogizogi-backend`)

여기저기(Yogizogi) 서비스의 **백엔드 서버** 레포입니다.  
Node.js + Express + TypeScript 기반이며, **도메인(기능) 단위 모듈 구조**를 사용합니다.

이 문서는 **팀원이 “어떤 작업을 할 때 어떤 폴더를 건드려야 하는지”**를 정리한 가이드입니다.

---

## 1. 전체 구조 개요

```txt
yogizogi-backend/
├─ src/
│  ├─ app.ts
│  ├─ server.ts
│  ├─ config/
│  ├─ common/
│  ├─ modules/
│  └─ infra/
├─ prisma/ or models/
├─ .env.example
├─ package.json
├─ tsconfig.json
└─ README.md

## 팀 개발 규칙

1. 새 기능 추가

관련 도메인 폴더를 src/modules/ 아래에서 찾거나 새로 만든다.

그 안에 *.route.ts, *.controller.ts, *.service.ts, *.repository.ts를 추가한다.

2. 공통 기능/도구

재사용 가능한 로직: src/common/utils/

공통 미들웨어: src/common/middleware/

3. 환경/DB 설정 변경

src/config/env.ts, src/config/db.ts, .env 수정

4. 외부 서비스 연동

메일, 파일 업로드, 외부 API 등: src/infra/ 아래에 디렉터리 추가 및 구현
```
