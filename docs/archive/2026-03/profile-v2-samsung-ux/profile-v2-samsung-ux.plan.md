# Plan: 프로필 v2 — 삼성 양식 완성도 + UI/UX 통일성 개선

> Plan Plus로 생성 (2026-03-17)
> Feature: `profile-v2-samsung-ux`

---

## 1. User Intent Discovery

### Core Problem
프로필 페이지가 삼성 지원서 양식을 반영했지만 **"대충 만들어진" 상태**:
- `prompt()` 다이얼로그 4곳 (끔찍한 UX)
- 백엔드 필드 있지만 UI 미노출 40%
- 삭제 시 confirm 없음 + API 에러 무시
- 1600줄 단일 파일 (유지보수 불가)
- 다른 페이지(company/new)와 UI 패턴 불일치

### Target Users
취업 준비생 (본인) — 삼성그룹 등 대기업 지원서 양식과 1:1 대응되는 프로필 관리

### Success Criteria
1. `prompt()` 사용 0건
2. 모든 삭제에 confirm + catch 에러 처리
3. 백엔드 지원 필드 100% UI 노출
4. 삼성 Select 옵션값과 1:1 매칭
5. 프로필 page.tsx 200줄 이내 (오케스트레이터), 탭별 컴포넌트 분리

---

## 2. 삼성 Select 옵션값 정밀 매핑 (Playwright 실측)

### 최종학력
`박사, 석사, 학사, 전문학사, 고등학교, 중학교, 초등학교, 무학`

### 졸업구분
- 고교: `졸업예정, 졸업, 수료, 중퇴, 검정고시`
- 대학: `졸업예정, 졸업, 수료, 중퇴`

### 전공계열 (30개)
```
건축, 기계, 디자인, 물리, 법학, 산공, 상경, 생물, 섬유/고분자,
수학, 식품, 신방, 어문, 예체능, 의약학, 이공기타, 인문기타,
재료/금속, 전기전자(HW), 전기전자(SW), 전산/컴퓨터, 조선/해양,
토목, 통계(이공), 통계(인문), 행정, 화학/화공, 환경/안전, MBA
```

### 학위구분
`주전공, 부전공, 복수학위, 복수전공`

### 학점유형
`4.5점만점(4.5~0), 4.3점만점(4.3~0), 4.0점만점(4.0~0), 100점만점(100~0), 해당없음`

### 병역사항
`복무완료(병역필)/복무중(완료예정), 미필, 비대상, 면제`

### 병역구분 (16개)
```
공익근무소집해제, 군복무중, 만기제대, 명예제대, 방위소집해제,
부선망제대, 불명예제대, 상이제대, 소집해제, 예편,
의가사제대, 의병제대, 제대기타, 특례보충역, 특례복무중
```

### 군별
`육군, 해군, 공군, 해병, 전경, 의경, 국제협력단, 의무소방`

### 계급 (17개)
```
계급없음, 이병, 일병, 상병, 병장, 하사, 중사, 상사, 원사,
준위, 소위, 중위, 대위, 소령, 중령, 대령
```

### 대내외 활동구분
`온라인활동, 교외커뮤니티활동, 국내연수활동, 교내커뮤니티활동, 기타`

---

## 3. CRITICAL 이슈 목록

| # | 이슈 | 심각도 | 해결 방법 |
|---|------|--------|----------|
| 1 | `prompt()` 4곳 (교과목/어학/자격증/수상) | CRITICAL | `AddItemDialog` 공통 모달 컴포넌트 |
| 2 | 삭제 시 confirm 없음 | CRITICAL | 모든 삭제에 `confirm()` + `try/catch` |
| 3 | 삭제 API 에러 무시 (catch 없음) | CRITICAL | `.catch(() => toast.error(...))` |
| 4 | 삭제 후 toast 누락 (자격증/수상) | HIGH | 통일적 toast.success 추가 |
| 5 | 1600줄 단일 파일 | HIGH | 오케스트레이터 + 7탭 컴포넌트 분리 |
| 6 | 백엔드 필드 UI 미노출 (40%) | HIGH | 각 탭에 누락 필드 추가 |
| 7 | 삼성 Select 옵션 불일치 | MEDIUM | 실측 옵션값으로 교체 |
| 8 | 고교/대학 분리 UI 없음 | MEDIUM | education-tab에 고교 섹션 추가 |
| 9 | 어학 PRIMARY 플래그 UI 없음 | MEDIUM | language-tab에 필수자격 섹션 추가 |
| 10 | academic_note UI 없음 | MEDIUM | education-tab 하단에 추가 |

---

## 4. 컴포넌트 분리 아키텍처

```
frontend/app/profile/page.tsx (~200줄, 오케스트레이터)
├── state 정의 + useEffect 로드/저장
├── 7탭 전환 렌더링
└── 각 탭 → 컴포넌트에 props 전달

frontend/components/profile/
├── profile-form.tsx          (기존 유지 — 기본정보: 이름/이메일/전화/요약/목표/핵심가치)
├── basic-info-extended.tsx   (NEW: 영문명/주소/보조전화)
├── military-form.tsx         (NEW: 병역 — 삼성 실측 Select 옵션)
├── education-tab.tsx         (NEW: 고교 분리 + 대학 카드 + 삼성 필드 전체)
├── course-tab.tsx            (NEW: 교과목 테이블 + AddItemDialog + 학점 요약)
├── career-tab.tsx            (NEW: 경력 + 대내외활동 — CareerEntryForm 래핑)
├── career-entry-form.tsx     (기존 확장 — employment_type/department/location/is_current 추가)
├── language-tab.tsx          (NEW: 필수자격 + 기타어학 + 자격증 + 수상 4섹션)
├── essay-tab.tsx             (NEW: 취미/존경인물 + 자소서 연결)
├── add-item-dialog.tsx       (NEW: 공통 추가 모달 — shadcn Dialog + 동적 필드)
├── file-upload.tsx           (기존 유지)
└── import-tab.tsx            (NEW: file-upload + Notion 래핑)
```

### `add-item-dialog.tsx` 설계

```tsx
interface FieldConfig {
  name: string;
  label: string;
  type: "text" | "select" | "date" | "number" | "checkbox";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: FieldConfig[];
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}
```

4곳에서 재사용:
- 교과목 추가: school_name, year, semester, course_name, category, credits
- 어학시험 추가: test_name, language, score/level, test_date, test_location, cert_number, is_primary
- 자격증 추가: cert_name, cert_level, acquired_date, cert_number, issuer
- 수상 추가: title, organization, award_date, description

---

## 5. 누락 UI 필드 추가 계획

### education-tab.tsx
- 고교 섹션: school, graduation_status, period (삼성과 동일)
- 대학 카드에 추가: `country`, `student_id`, `is_transfer`
- 하단: `academic_note` Textarea (100자 카운터)

### career-entry-form.tsx 확장
- `employment_type` Select (정규직/계약직/인턴/파트타임/프리랜서)
- `department` Input (부서명)
- `location` Input (소재지)
- `is_current` Checkbox (현재 근무 여부)

### career-tab.tsx — 대내외활동 섹션
- `entry_type` = "activity" | "training"
- `activity_category` Select: 온라인활동/교외커뮤니티/국내연수/교내커뮤니티/기타

### language-tab.tsx — 필수자격 섹션
- 영어회화 필수자격 (OPIc/TOEIC-Speaking) 별도 카드
- `is_primary` = true인 레코드를 최상단에 표시
- 추가 시 is_primary 체크박스 제공

---

## 6. 구현 순서

```
Step 1: add-item-dialog.tsx 공통 모달 컴포넌트 생성
Step 2: 프로필 page.tsx 오케스트레이터로 리팩토링 (~200줄)
Step 3: basic-info-extended.tsx + military-form.tsx (삼성 실측 옵션)
Step 4: education-tab.tsx (고교 분리 + 삼성 필드 + academic_note)
Step 5: course-tab.tsx (모달 교체 + 학점 요약)
Step 6: career-tab.tsx + career-entry-form.tsx 확장 (누락 필드 + 활동구분)
Step 7: language-tab.tsx (4섹션 + 필수자격 + 모달)
Step 8: essay-tab.tsx + import-tab.tsx 분리
Step 9: 삭제 confirm + 에러 처리 일괄 적용
Step 10: 삼성 Select 옵션값 정밀 교체
```

---

## 7. 파일 요약

| 구분 | 파일 | 변경 |
|------|------|------|
| NEW | `components/profile/add-item-dialog.tsx` | 공통 추가 모달 (prompt() 대체) |
| NEW | `components/profile/basic-info-extended.tsx` | 영문명/주소/보조전화 |
| NEW | `components/profile/military-form.tsx` | 병역 카드 (삼성 실측 옵션) |
| NEW | `components/profile/education-tab.tsx` | 고교+대학+academic_note |
| NEW | `components/profile/course-tab.tsx` | 교과목 테이블+모달+요약 |
| NEW | `components/profile/career-tab.tsx` | 경력+대내외활동 래핑 |
| NEW | `components/profile/language-tab.tsx` | 어학+자격증+수상 4섹션 |
| NEW | `components/profile/essay-tab.tsx` | 취미/존경인물+자소서 |
| NEW | `components/profile/import-tab.tsx` | 파일+Notion 래핑 |
| REWRITE | `app/profile/page.tsx` | 1600줄→200줄 오케스트레이터 |
| MODIFY | `components/profile/career-entry-form.tsx` | +employment_type, department, location, is_current |
| MODIFY | `components/profile/profile-form.tsx` | 기존 유지 |

---

## 8. 검증

```bash
# 타입체크
cd frontend && npx tsc --noEmit

# E2E 검증
# 1. /profile → 7탭 정상 전환
# 2. 기본정보 → 영문명/주소/병역 입력 + 저장
# 3. 학력 → 고교 분리 표시 + 대학 GPA/졸업구분/전공계열 저장
# 4. 이수교과목 → Dialog 모달로 추가 (prompt 아님!) + 삭제 confirm
# 5. 경력 → employment_type/department/location 표시 + 활동구분 Select
# 6. 외국어·자격 → 필수자격(is_primary) + Dialog 모달 추가
# 7. Essay → 취미/존경인물 저장
# 8. 모든 삭제 → confirm 팝업 + 에러 시 toast.error
```

---

## 9. Brainstorming Log

| Phase | 결정 | 이유 |
|-------|------|------|
| Q1 | 삼성 완성도 + UI/UX 둘 다 | 사용자: "둘 다 한번에" |
| Q2 | 컴포넌트 분리 방식 | 1600줄 → 200줄 + 7컴포넌트로 유지보수성 극대화 |
| Q3 | 4개 항목 모두 포함 | prompt() 제거, confirm, 컴포넌트 분리, 누락 필드 |
| 삼성 재탐색 | Select 옵션값 정밀 수집 | 전공계열 30개, 병역구분 16개, 계급 17개 등 실측 |
