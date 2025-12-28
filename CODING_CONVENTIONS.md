# 팀 코딩 컨벤션 가이드

초보자도 쉽게 따라할 수 있는 코딩 규칙입니다! 🎯

---

## 1. 변수명 규칙 (가장 중요!)

### ✅ 올바른 예시

```javascript
// camelCase 사용 (첫 글자는 소문자, 단어 구분은 대문자)
const postId = 1;
const userName = "홍길동";
const isDeleted = false;
const postList = [];
const totalCount = 100;
```

### ❌ 잘못된 예시

```javascript
const PostId = 1; // ❌ 첫 글자 대문자 (클래스명처럼 보임)
const user_name = "홍"; // ❌ 언더스코어 (Python 스타일)
const isdeleted = false; // ❌ 단어 구분 없음
const post_list = []; // ❌ 언더스코어
```

### 📌 규칙 요약

- **변수명**: `camelCase` (소문자로 시작)
- **상수명**: `UPPER_SNAKE_CASE` (전체 대문자, 언더스코어)
  ```javascript
  const MAX_POST_COUNT = 100;
  const API_BASE_URL = "http://localhost:3000";
  ```
- **boolean 변수**: `is`, `has`, `can`으로 시작
  ```javascript
  const isDeleted = false;
  const hasPermission = true;
  const canEdit = true;
  ```
- **배열**: 복수형 사용
  ```javascript
  const posts = []; // ✅
  const users = []; // ✅
  const tags = []; // ✅
  const post = []; // ❌ (단수형)
  ```

---

## 2. 함수명 규칙

### 레이어별 함수명 패턴

#### 📁 Repository (데이터 접근)

```javascript
// 조회: find로 시작
exports.findPostById = async (id) => { ... }
exports.findAllPosts = async () => { ... }
exports.findPostsByTag = async (tag) => { ... }

// 생성/수정/삭제: 동사 사용
exports.createPost = async (data) => { ... }
exports.updatePost = async (id, data) => { ... }
exports.deletePost = async (id) => { ... }

// 추가/제거: add/remove 사용
exports.addTagToPost = async (postId, tagId) => { ... }
exports.removeTagFromPost = async (postId, tagId) => { ... }
```

#### 📁 Service (비즈니스 로직)

```javascript
// 조회: get으로 시작
exports.getPosts = async (queryParams) => { ... }
exports.getPostById = async (id) => { ... }
exports.getPopularPosts = async (queryParams) => { ... }

// 생성/수정/삭제: 동사 사용
exports.createPost = async (postData) => { ... }
exports.updatePost = async (id, updateData) => { ... }
exports.deletePost = async (id) => { ... }

// 추가/제거: add/remove 사용
exports.addTagToPost = async (postId, tagName) => { ... }
exports.removeTagFromPost = async (postId, tagId) => { ... }
```

#### 📁 Controller (HTTP 요청 처리)

```javascript
// Controller는 Service와 동일한 이름 사용
exports.getPosts = async (req, res, next) => { ... }
exports.getPostById = async (req, res, next) => { ... }
exports.createPost = async (req, res, next) => { ... }
exports.updatePost = async (req, res, next) => { ... }
exports.deletePost = async (req, res, next) => { ... }
```

### 📌 규칙 요약

- **Repository**: `find*`, `create*`, `update*`, `delete*`
- **Service**: `get*`, `create*`, `update*`, `delete*`
- **Controller**: Service와 동일한 이름
- **동사로 시작**: `get`, `create`, `update`, `delete`, `add`, `remove`
- **명사만 사용 금지**: `posts()` ❌ → `getPosts()` ✅

---

## 3. 파일 구조 규칙

### 📁 모듈 구조 (반드시 지키기!)

```
src/modules/post/
├── post.route.js      # 라우트 정의
├── post.controller.js # HTTP 요청 처리
├── post.service.js    # 비즈니스 로직
├── post.repository.js # 데이터베이스 접근
└── models/            # 데이터 모델
```

### 📌 규칙 요약

- **파일명**: `모듈명.역할.js` 형식
- **폴더명**: `camelCase` 또는 `kebab-case` (팀에서 통일)
- **한 폴더 = 한 기능**: 관련 파일들을 같은 폴더에 모음

---

## 4. 코드 스타일 규칙

### 들여쓰기

```javascript
// ✅ 2칸 스페이스 사용 (Tab 금지!)
function example() {
  if (condition) {
    return true;
  }
}

// ❌ Tab 사용
function example() {
  if (condition) {
    return true;
  }
}
```

### 세미콜론

```javascript
// ✅ 세미콜론 사용 (일관성 유지)
const name = "홍길동";
const age = 25;

// ❌ 세미콜론 없음 (팀에서 통일 안 됨)
const name = "홍길동";
const age = 25;
```

### 따옴표

```javascript
// ✅ 작은따옴표 사용 (팀에서 통일)
const message = "안녕하세요";
const name = "홍길동";

// 또는 큰따옴표 (팀에서 통일하면 OK)
const message = "안녕하세요";
```

### 줄바꿈

```javascript
// ✅ 함수 사이 빈 줄 1개
function func1() {
  // ...
}

function func2() {
  // ...
}

// ❌ 빈 줄 없음
function func1() {
  // ...
}
function func2() {
  // ...
}
```

---

## 5. 주석 규칙

### 파일 상단 주석

```javascript
// 게시글 서비스
// 또는
// src/modules/post/post.service.js
```

### 함수 주석 (JSDoc 스타일)

```javascript
/**
 * 게시글 목록 조회
 * @param {Object} queryParams - 쿼리 파라미터 (page, limit, region 등)
 * @returns {Object} 게시글 목록과 페이지네이션 정보
 */
exports.getPosts = async (queryParams) => {
  // ...
};
```

### 인라인 주석

```javascript
// ✅ 간단한 설명
const offset = (page - 1) * limit; // 페이지 오프셋 계산

// ❌ 너무 자세한 설명 (코드가 명확하면 주석 불필요)
// offset은 page에서 1을 빼고 limit을 곱한 값입니다
const offset = (page - 1) * limit;
```

---

## 6. 에러 처리 규칙

### Service 레이어

```javascript
// ✅ 에러 객체 형식 통일
if (!post) {
  throw { statusCode: 404, message: "게시글을 찾을 수 없습니다." };
}

if (!author_id || !title) {
  throw { statusCode: 400, message: "필수 항목을 입력해주세요." };
}
```

### Controller 레이어

```javascript
// ✅ try-catch 사용
exports.getPostById = async (req, res, next) => {
  try {
    const post = await postService.getPostById(req.params.id);
    return success(res, post, "게시글 조회 성공");
  } catch (err) {
    next(err); // 에러 핸들러로 전달
  }
};
```

---

## 7. 비동기 처리 규칙

### ✅ async/await 사용

```javascript
exports.getPostById = async (id) => {
  const post = await postRepository.findPostById(id);
  if (!post) {
    throw { statusCode: 404, message: "게시글을 찾을 수 없습니다" };
  }
  return post;
};
```

### ❌ Promise.then() 사용 금지 (가독성 떨어짐)

```javascript
exports.getPostById = (id) => {
  return postRepository.findPostById(id).then((post) => {
    if (!post) {
      throw { statusCode: 404, message: "게시글을 찾을 수 없습니다" };
    }
    return post;
  });
};
```

---

## 8. 모듈 export 규칙

### ✅ exports 사용 (현재 프로젝트 스타일)

```javascript
// post.service.js
exports.getPosts = async (queryParams) => { ... };
exports.getPostById = async (id) => { ... };
exports.createPost = async (postData) => { ... };
```

### ❌ module.exports = {} 사용 금지 (팀 스타일과 다름)

```javascript
module.exports = {
  getPosts: async (queryParams) => { ... },
  getPostById: async (id) => { ... },
};
```

---

## 9. 데이터베이스 쿼리 규칙

### ✅ Repository에서만 DB 접근

```javascript
// ✅ post.repository.js
exports.findPostById = async (id) => {
  return await TravelPost.findOne({ where: { id } });
};

// ❌ post.service.js에서 직접 DB 접근 금지
exports.getPostById = async (id) => {
  return await TravelPost.findOne({ where: { id } }); // ❌
};
```

---

## 10. 체크리스트 (코드 작성 전 확인!)

### 변수명

- [ ] camelCase 사용했나?
- [ ] boolean은 is/has/can으로 시작했나?
- [ ] 배열은 복수형 사용했나?

### 함수명

- [ ] Repository는 `find*`로 시작했나?
- [ ] Service는 `get*`로 시작했나?
- [ ] 동사로 시작했나?

### 코드 스타일

- [ ] 들여쓰기 2칸 스페이스 사용했나?
- [ ] 세미콜론 사용했나?
- [ ] 함수 사이 빈 줄 1개 넣었나?

### 에러 처리

- [ ] try-catch 사용했나?
- [ ] 에러 객체 형식 통일했나?

### 파일 구조

- [ ] 올바른 폴더에 파일을 만들었나?
- [ ] 파일명 형식 맞췄나?

---

## 11. 자주 하는 실수들

### ❌ 실수 1: 변수명 대소문자 혼용

```javascript
const PostId = 1; // ❌
const postId = 1; // ✅
```

### ❌ 실수 2: 함수명 일관성 없음

```javascript
// Service에서
exports.findPosts = ...;  // ❌ (find는 Repository용)
exports.getPosts = ...;   // ✅
```

### ❌ 실수 3: 세미콜론 누락

```javascript
const name = "홍길동"; // ❌
const name = "홍길동"; // ✅
```

### ❌ 실수 4: 들여쓰기 혼용

```javascript
function example() {
  if (true) {
    // 2칸
    if (true) {
      // 4칸
      return; // 6칸
    }
  }
}
```

---

## 12. 팀 회의에서 정해야 할 것들

1. **들여쓰기**: 2칸 vs 4칸 vs Tab
2. **따옴표**: 작은따옴표 vs 큰따옴표
3. **세미콜론**: 사용 vs 미사용
4. **줄 길이**: 최대 몇 글자? (보통 80~100자)
5. **파일명**: camelCase vs kebab-case

---

## 13. 도구로 자동 체크하기

### ESLint 설정 (나중에 추가하면 좋음)

```json
{
  "extends": ["eslint:recommended"],
  "rules": {
    "indent": ["error", 2],
    "quotes": ["error", "single"],
    "semi": ["error", "always"]
  }
}
```

---

## 💡 기억할 것

1. **일관성이 가장 중요!** - 팀 전체가 같은 스타일 사용
2. **기존 코드를 따라하기** - 이미 있는 코드 스타일을 그대로 따르기
3. **의심스러우면 물어보기** - 팀원에게 확인하는 게 가장 확실
4. **작은 것부터 시작** - 변수명, 함수명부터 통일하기

---

## 📞 질문이 있으면?

팀 채팅방이나 회의에서 함께 정하기! 초보자도 괜찮으니 서로 도와가며 하기! 💪
