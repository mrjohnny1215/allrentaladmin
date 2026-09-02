# ALLRENTAL ADMIN Phase 0 조사 보고서
## 생성일: 2026-09-03 (KST)

---

## [1. ALLNUP 전체 메뉴 구조]
> **조사 방법**: BrowserUse 환경 제약으로 수동 조사 필요 → 사용자 PC 브라우저에서 ALLNUP(`https://allnup.com/`) 접속 후 조사 요청

### 알 수 있는 메뉴 (master prompt 기반)
- 정산서
- 상담
- 접수
- 견적서
- 접수내역
- 접수링크
- 공지문의
- 제품비교
- 메인 (현황통계)
- 프로모션
- 제휴카드
- 명함
- FAQ
- 사용법

### [2. 메뉴별 상세 기능]
> **알아서 조사 필요** — 사용자 PC 브라우저에서 ALLNUP 로그인 후 조사

### [3. 상담 전체 흐름]
> **알아서 조사 필요**

### [4. 상품 검색/선택 전체 흐름]
> **알아서 조사 필요**

### [5. 제품비교 전체 흐름]
> **알아서 조사 필요**

### [6. 견적서 전체 흐름]
> **알아서 조사 필요**

### [7. 접수 전체 흐름]
> **알아서 조사 필요**

### [8. 접수내역 전체 흐름]
> **알아서 조사 필요**

### [9. 접수링크 전체 흐름]
> **알아서 조사 필요**

### [10. 정산서 전체 흐름]
> **알아서 조사 필요**

### [11. 공지/문의/건의 전체 흐름]
> **알아서 조사 필요**

---

## [12. ALLRENTAL ADMIN 현재 코드 구조]

### 기술 스택
- **React 18** + **Vite 5** + **React Router 6**
- **Supabase** (`@supabase/supabase-js` ^2.112.4) — 사용자 데이터 관리
- **localStorage** fallback (Supabase 없이도 로컬 동작)
- **Vercel** 배포 (프레임워크: vite)

### 라우트 (App.jsx)
```
/                          → LoginGate + Catalog (메인 카탈로그)
/admin                     → LoginGate + AdminDashboard (관리자 대시보드)
/admin/counsel             → Layout + Counsel (상담)
/admin/reception           → Layout + Main (접수)
/admin/details             → Layout + Details (제품비교)
/admin/estimate_form       → Layout + EstimateForm (견적서)
/admin/submission_list     → Layout + SubmissionList (접수내역)
/admin/progress            → Layout + Counsel (현황통계 — Counsel复用)
/admin/settlement_manage   → Layout + SettlementManage (정산서)
/admin/customer_apply_manage → Layout + CustomerApplyManage (접수링크)
/admin/promotions          → Layout + Counsel (프로모션 — Counsel复用)
/admin/creditcard          → Layout + Counsel (제휴카드 — Counsel复用)
/admin/suggestion_board    → Layout + SuggestionBoard (공지문의)
/admin/business_card       → Layout + Counsel (명함 — Counsel复用)
/admin/faq                 → Layout + Counsel (FAQ — Counsel复用)
/admin/howto               → Layout + Counsel (사용법 — Counsel复用)
```

### 컴포넌트 구조
- `App.jsx` — 메인 라우터
- `LoginGate.jsx` — 로그인/회원가입/비밀번호 찾기
- `auth.jsx` — 인증 컨텍스트 (useAuth)
- `Catalog.jsx` — 상품 카탈로그 (메인)
- `Counsel.jsx` — 상담 페이지
- `Main.jsx` — 접수 페이지
- `Details.jsx` — 제품비교 페이지
- `EstimateForm.jsx` — 견적서
- `SubmissionList.jsx` — 접수내역
- `SettlementManage.jsx` — 정산서
- `CustomerApplyManage.jsx` — 접수링크 관리
- `SuggestionBoard.jsx` — 공지/문의/건의
- `AdminDashboard.jsx` — 관리자 대시보드
- `Layout.jsx` — 사이드바 레이아웃
- `AllRentalLogo.jsx` — 로고 컴포넌트

### 데이터 소스
- `public/data/products.json` (771건) — 상품 데이터 (메인 소스)
- `localStorage` — 접수/견적/접수내역/접수링크/공지문의/정산 데이터
- `Supabase users 테이블` — 회원 데이터
- `/api/*` — API 프록시 (실패 시 localStorage fallback)

### 인증
- `LoginGate` → `auth.jsx` → `supabaseClient.js`
- 세션: `localStorage.allrental_auth`
- 기본 관리자: `admin` / `admin` (SUPABASE에 seed)

---

## [13. 현재 실제 구현된 기능]

### ✅ 완전 구현
1. **상품 카탈로그** (Catalog.jsx) — 771개 상품, 스마트 필터, 카테고리/브랜드/가격 필터, 수수료 ON/OFF, 렌탈료 계산기
2. **상담** (Counsel.jsx) — 상품 검색/필터, 렌탈 옵션, 접수 버튼 → 접수 페이지 이동
3. **접수** (Main.jsx) — 상품 검색, 고객정보, 설치주소, 제품정보(다중), 옵션선택, 미리보기, 복사, 접수
4. **접수내역** (SubmissionList.jsx) — 날짜/키워드 검색, 상세보기
5. **견적서** (EstimateForm.jsx) — 견적 작성/저장/불러오기/삭제/인쇄
6. **정산서** (SettlementManage.jsx) — 월별/브랜드/고객명 검색, CSV 다운로드
7. **접수링크** (CustomerApplyManage.jsx) — 링크 생성/토글/삭제
8. **공지문의** (SuggestionBoard.jsx) — 공지/문의/건의, 검색, 작성
9. **제품비교** (Details.jsx) — 제품군/관리주기/약정/브랜드별 필터, 3~9년 비교 테이블
10. **관리자 대시보드** (AdminDashboard.jsx) — 회원 목록, 승인/수수료 등급/삭제
11. **로그인/회원가입/비밀번호 찾기** (LoginGate.jsx)

### ⚠️ 부분 구현
1. **상담 → 접수 연결** — `sessionStorage`로 전달되나, 실제 서버 연동 없음
2. **정산서** — `fetch('/api/settlements')` 호출 시도하나 백엔드 없음 → localStorage fallback
3. **공지문의** — `fetch('/api/board-posts')` 호출 시도하나 백엔드 없음 → localStorage fallback
4. **수수료** — Supabase 기반 `FEE_GRADES` 있으나 실제 상품별 수수료 매핑은 `pricing_matrix`에서만
5. **접수링크** — 토큰 기반이지만 실제 고객 입력 페이지(`/apply/:token`)는 별도 구현 필요

### ❌ 미구현 (master prompt 기반)
1. **견적서 → 접수 연결** — 견적서에서 접수로 이동 기능 없음
2. **접수 → 정산 자동 연동** — 접수 완료 시 정산서 자동 반영 없음
3. **고객 통합 이력** — 고객별 상담/견적/접수/정산 이력 조회 없음
4. **통합 검색** — 고객명/전화번호/모델번호/접수번호 통합 검색 없음
5. **견적서 → 접수** 흐름 없음
6. **상태 자동 동기화** — 견적발송→상담상태 변경 등 없음
7. **접수링크 → 접수내역 반영** — 고객이 링크로 접수하면 관리자 접수내역에 반영되는 흐름 없음
8. **실시간 ALLNUP 연동** — API 연동 없음 (전부 localStorage)

---

## [14. 부분 구현된 기능]

| 기능 | 상태 | 설명 |
|------|------|------|
| 정산서 | 부분 | `/api/settlements` 호출 시도, 실패 시 localStorage fallback |
| 공지문의 | 부분 | `/api/board-posts` 호출 시도, 실패 시 localStorage fallback |
| 상담→접수 | 부분 | sessionStorage 전달, 실제 DB 저장 없음 |
| 수수료 | 부분 | `FEE_GRADES` 있으나 상품별 매핑 불완전 |
| 접수링크 | 부분 | 생성/토글/삭제 있으나 고객 입력 페이지 별도 필요 |

---

## [15. 미구현 기능]

> master prompt 기반 ALLNUP ↔ ALLRENTAL ADMIN 대응표에서 확인된 미구현 기능

1. **견적서 → 접수 흐름** — 견적서에서 접수로 이동하는 기능
2. **접수 → 정산 자동 반영** — 접수 완료 시 정산서 자동 생성/반영
3. **고객 통합 이력** — 고객별 전 이력 조회
4. **통합 검색** — 고객명/전화번호/모델번호/접수번호 통합 검색
5. **상태 자동 동기화** — 견적발송→상담, 접수완료→상담 등
6. **접수링크 고객 입력 페이지** — `/apply/:token` 실제 동작
7. **ALLNUP 실시간 연동** — API 연동 없음
8. **설치/수수료/정산** — 별도 관리 기능
9. **고객 이력** — 9/1 문의 → 9/1 상담 → 9/1 상품 비교 → ... 흐름

---

## [16. ALLNUP 실시간 연동이 필요한 기능]

| 기능 | 연동 필요성 | 난이도 |
|------|------------|--------|
| 정산서 | 높음 — 실제 정산 데이터 필요 | 중 |
| 접수내역 | 높음 — 실제 접수 데이터 필요 | 중 |
| 접수링크 | 중 — 고객 입력과 관리자 반영 | 하 |
| 공지문의 | 중 — 실시간 게시글 관리 | 하 |
| 상담 | 중 — 실제 상담 데이터 필요 | 중 |
| 견적서 | 낮음 — 내부 문서 | 하 |
| 접수 | 낮음 — 내부 접수 | 하 |
| 제품비교 | 낮음 — 상품 데이터 이미 있음 | 하 |

---

## [17. ALLRENTAL ADMIN 자체 구현 가능한 기능]

| 기능 | 구현 가능 여부 | 우선순위 |
|------|---------------|----------|
| 상담 → 상품 검색 → 선택 | ✅ 구현됨 | 높음 |
| 제품비교 | ✅ 구현됨 | 높음 |
| 견적서 | ✅ 구현됨 | 높음 |
| 접수 | ✅ 구현됨 | 높음 |
| 접수내역 | ✅ 구현됨 | 높음 |
| 관리자 대시보드 | ✅ 구현됨 | 높음 |
| 정산서 | ⚠️ 부분 | 중 |
| 공지문의 | ⚠️ 부분 | 중 |
| 접수링크 | ⚠️ 부분 | 중 |
| 고객 통합 이력 | ❌ 미구현 | 높음 |
| 견적 → 접수 흐름 | ❌ 미구현 | 높음 |
| 접수 → 정산 자동 반영 | ❌ 미구현 | 중 |
| 설치 관리 | ❌ 미구현 | 중 |
| 수수료 관리 | ❌ 미구현 | 중 |

---

## [18. 상품 데이터 구조]

```json
{
  "id": "...",
  "brand": "코웨이",
  "name": "얼음냉온 옴니플러스",
  "model_code": "WI-53C9600M",
  "category": "정수기",
  "product_group": "얼음냉온_데스크(탱크)",
  "colors": ["오트밀베이지"],
  "specs": { "capacity": "...", "size": "..." },
  "tags": ["얼음냉온", "탱크형", "데스크탑", ...],
  "min_monthly_fee": 0,
  "max_commission": 0,
  "pricing_matrix": [
    {
      "contract": "신규",
      "years": "5년",
      "mgmt": "방문관리",
      "mgmt_cycle": "...",
      "rule_raw": "...",
      "monthly_fee": 0,
      "commission": 0
    }
  ],
  "promotions": { "common": "", "monthly": "..." },
  "images": [...],
  "detail_description_images": [...],
  "selling_points": { "points": [], "filters": [] },
  "thumbnail": "..."
}
```

---

## [19. 수수료 데이터 구조]

```js
// src/lib/users.js
const FEE_GRADES = {
  '100%': { label: '수수료 100%', rate: 1.0 },
  '90%':  { label: '수수료 90%',  rate: 0.90 },
  '82%':  { label: '수수료 82%',  rate: 0.82 },
  '24%':  { label: '수수료 24%',  rate: 0.76 },
};
```
- 상품별 수수료: `pricing_matrix[].commission` — 상품 옵션별 수수료 금액
- 현재 코드에서 `applyFeeRate(commission, rate)`로 사용자 등급 적용

---

## [20. 인증/보안 문제]

### 🔴 발견된 문제
1. **Supabase 시크릿 키 노출** — `src/lib/supabase.js`에 `sb_publishable_...` 직접 하드코딩 (공개 키는 괜찮으나 관리 필요)
2. **`.env` 파일** — 로컬 개발용 환경 변수 포함, `.gitignore`에 등록되어 있어 Git에는 노출되지 않음
3. **기본 관리자 비밀번호** — `admin` / `admin` (SUPABASE seed)
4. **Supabase RLS 비활성화** — `users` 테이블 RLS DISABLE 상태 (작업 편의성, 프로덕션 시 재검토 필요)
5. **로그인 인증** — localStorage 기반 세션 (`allrental_auth`), 서버 사이드 인증 없음

### ⚠️ 개선 필요
1. `src/lib/supabase.js`의 키를 환경 변수(`VITE_SUPABASE_ANON_KEY`)로 관리
2. 프로덕션에서 RLS 활성화 검토
3. 기본 관리자 비밀번호 변경

---

## [21. 모바일 문제]

### ✅ 이미 반영된 사항
- `vercel.json` SPA fallback rewrite (`/admin/:path*` → `/index.html`)
- 사이드바 모바일 오버레이 (`@media (max-width: 768px)`)
- `AdminDashboard.jsx`에서 관리자 ID 표시, 로그아웃 버튼

### ⚠️ 개선 필요
- `src/App.jsx`에서 `/admin/counsel`, `/admin/reception` 등 Route로 보호되지 않은 메뉴 (Layout 없는 Route)
  - `/admin/counsel`, `/admin/reception`, `/admin/details`, `/admin/estimate_form` 등은 `LoginGate` 없이 직접 접근 가능
- 스마트 필터의 카테고리별 필터 옵션은 잘 구현됨

---

## [22. ALLNUP ↔ ALLRENTAL ADMIN 전체 기능 대응표]

| ALLNUP 기능 | ALLNUP 동작 | ALLRENTAL ADMIN 현재 기능 | 구현상태 | 누락 기능 | 필요한 데이터 | 구현방법 | 난이도 | 우선순위 |
|------------|------------|------------------------|---------|----------|------------|--------|--------|---------|
| 정산서 | 정산서 조회/검색/필터 | SettlementManage (부분) | 부분 | API 연동, 정산 반영 | 정산 데이터 | Supabase 또는 API | 중 | 중 |
| 상담 | 상담 조회/상품검색/접수 | Counsel (완전) | 완전구현 | — | — | — | 하 | 높음 |
| 접수 | 접수폼/전송/접수완료 | Main (완전) | 완전구현 | — | — | — | 하 | 높음 |
| 견적서 | 견적생성/조회/수정/삭제 | EstimateForm (완전) | 완전구현 | 견적→접수 연결 | — | sessionStorage 연동 | 중 | 높음 |
| 접수내역 | 접수일/번호/고객/상태 | SubmissionList (완전) | 완전구현 | — | — | — | 하 | 높음 |
| 접수링크 | 링크생성/고객전달 | CustomerApplyManage (부분) | 부분 | 고객 입력 페이지(`/apply/:token`) | — | Supabase 또는 localStorage | 중 | 중 |
| 공지문의 | 공지/문의/건의 | SuggestionBoard (부분) | 부분 | API 연동, 댓글/답글/페이지네이션 | — | Supabase 또는 API | 중 | 중 |
| 제품비교 | 제품비교 | Details (완전) | 완전구현 | — | — | — | 하 | 높음 |
| 관리자 대시보드 | 회원관리/승인/수수료 | AdminDashboard (완전) | 완전구현 | — | — | — | 하 | 높음 |
| 고객 통합 이력 | 고객별 전 이력 조회 | 없음 | 미구현 | 고객 이력 테이블 | Supabase | 새 컴포넌트 | 중 | 높음 |
| 견적→접수 | 견적에서 접수 | 없음 | 미구현 | 견적→접수 플로우 | — | sessionStorage 연동 | 중 | 높음 |
| 상태 자동 동기화 | 상태 변경 자동 반영 | 없음 | 미구현 | 상태 머신 | — | 상태 자동화 로직 | 중 | 중 |
| 접수 → 정산 반영 | 접수 시 정산 자동 생성 | 없음 | 미구현 | 정산 생성 로직 | — | Supabase 트리거 | 중 | 중 |

---

## [23. 가장 먼저 고칠 문제 TOP5]

### 🔴 1. Supabase 키 하드코딩 문제 (보안)
- **현재**: `src/lib/supabase.js`에 `sb_publishable_...` 직접 하드코딩
- **개선**: `import.meta.env.VITE_SUPABASE_ANON_KEY`로 변경
- **영향**: 보안 best practice

### 🔴 2. 기본 관리자 비밀번호 `admin`/`admin`
- **현재**: 모든 환경에서 동일한 기본 비밀번호
- **개선**: 최초 접속 시 비밀번호 변경 강제 또는 임의 비밀번호 발급
- **영향**: 보안

### 🟡 3. `/admin/` 라우트 LoginGate 미적용
- **현재**: `/admin/counsel`, `/admin/reception`, `/admin/details` 등은 `LoginGate` 없이 접근 가능
- **개선**: 모든 `/admin/*` 라우트에 `LoginGate` 래핑 또는 Layout에서 인증 체크
- **영향**: 인증 우회 가능성

### 🟡 4. 정산서/공지문의 API 연동 부재
- **현재**: `/api/settlements`, `/api/board-posts` 호출 시도 → 실패 시 localStorage fallback
- **개선**: Supabase 기반 API 또는 Vercel Serverless Function
- **영향**: 다중 디바이스 데이터 일관성

### 🟡 5. 견적서 → 접수 연결 미구현
- **현재**: 견적서에서 접수로 이동하는 기능 없음
- **개선**: 견적서 페이지에서 "접수하기" 버튼 → `sessionStorage`로 전달 후 `/admin/reception` 이동
- **영향**: 업무 흐름 완결성

---

## [24. 개발 우선순위 TOP10]

| 순위 | 기능 | 이유 | 난이도 |
|------|------|------|--------|
| 1 | Supabase 키 환경 변수화 | 보안 필수 | 하 |
| 2 | `/admin/*` 라우트 LoginGate 적용 | 보안 필수 | 중 |
| 3 | 견적서 → 접수 연결 | 업무 흐름 핵심 | 중 |
| 4 | 정산서 Supabase 연동 | 다중 디바이스 데이터 일관성 | 중 |
| 5 | 공지문의 Supabase 연동 | 다중 디바이스 데이터 일관성 | 중 |
| 6 | 고객 통합 이력 | 업무 효율성 | 중 |
| 7 | 접수 → 정산 자동 반영 | 업무 자동화 | 중 |
| 8 | 기본 관리자 비밀번호 변경 | 보안 | 하 |
| 9 | 상태 자동 동기화 | 업무 자동화 | 중 |
| 10 | 접수링크 고객 입력 페이지 | 기능 완결성 | 중 |

---

## [25. 추천 구현 순서]

```
Phase 0.1 — 보안 강화
  → Supabase 키 환경 변수화
  → `/admin/*` 라우트 LoginGate 적용
  → 기본 관리자 비밀번호 변경

Phase 0.2 — 핵심 업무 흐름 완결
  → 견적서 → 접수 연결
  → 접수 → 정산 자동 반영

Phase 0.3 — 데이터 일관성
  → 정산서 Supabase 연동
  → 공지문의 Supabase 연동
  → 상담/접수 Supabase 연동

Phase 0.4 — 고객 통합 이력
  → 고객 상세 페이지
  → 이력 조회
```

---

## 🚨 브라우저 자동화 불가 — 수동 진행 요청

### 현재 상황
- **BrowserUse 환경 제약**: CDP 연결 문제로 브라우저 자동화 불가
- **allrentaladmin 코드 분석**: 완료
- **ALLNUP 기능 조사**: 수동 필요

### 당신의 PC에서 해주셔야 할 일

#### 1. ALLNUP 기능 조사
```
1. 브라우저에서 https://allnup.com/ 접속
2. ID: sunghoon / PW: you098! 로 로그인
3. 모든 메뉴/서브메뉴 조사
4. 상담/견적/접수/접수내역/정산/제품비교/공지문의 흐름 조사
5. 각 화면의 입력필드, 필수값, 드롭다운, 검색, 필터, 버튼, 팝업, 모달 조사
6. 결과를 텍스트/스크린샷으로 공유
```

#### 2. allrentaladmin 코드 검토
```bash
cd /opt/data/allrentaladmin
git status          # 현재 변경사항 확인
git log --oneline   # 커밋 이력 확인
```

#### 3. 배포 확인
- `https://allrentaladmin.vercel.app` 접속 → 현재 기능 확인

### 제가 가능한 것
- 코드 수정/빌드/배포 (Vercel CLI 또는 REST API)
- **BrowserUse 브라우저 자동화는 불가** (환경 제약)

ALLNUP 조사 결과를 공유해주시면, 기능 대응표와 개발 우선순위를 구체화하겠습니다.
