# Design: 프로필 v2 — 삼성 양식 완성도 + UI/UX 통일성 개선

> Feature: `profile-v2-samsung-ux`
> Plan: `docs/01-plan/features/profile-v2-samsung-ux.plan.md`
> Date: 2026-03-17

---

## 1. 아키텍처 개요

### 컴포넌트 트리

```
ProfilePage (app/profile/page.tsx) — ~200줄 오케스트레이터
│
├── state: profile fields + 관련 테이블 데이터 (courses, languages, certs, awards)
├── useEffect: loadProfile() — 프로필 + 관련 데이터 병렬 로드
├── handleSave(): 프로필 저장 (확장 필드 포함)
│
├── Tab: "기본정보"
│   ├── <ProfileForm /> — 기존 (이름/이메일/전화/요약/목표/핵심가치)
│   ├── <BasicInfoExtended /> — NEW (영문명/주소/보조전화)
│   └── <MilitaryForm /> — NEW (병역사항)
│
├── Tab: "학력"
│   └── <EducationTab /> — NEW (고교 분리 + 대학 카드 + 삼성 필드 + academic_note)
│
├── Tab: "이수교과목"
│   └── <CourseTab /> — NEW (테이블 + AddItemDialog + 학점 요약)
│
├── Tab: "경력"
│   └── <CareerTab /> — NEW (CareerEntryForm 래핑 + 대내외활동)
│
├── Tab: "외국어·자격"
│   └── <LanguageTab /> — NEW (필수자격 + 기타어학 + 자격증 + 수상)
│
├── Tab: "Essay"
│   └── <EssayTab /> — NEW (취미/존경인물 + 자소서 연결)
│
└── Tab: "가져오기"
    └── <ImportTab /> — NEW (FileUpload + Notion 래핑)
```

### 공통 패턴

모든 탭 컴포넌트는 동일한 패턴을 따른다:

```tsx
interface TabProps {
  profileId: string | null;     // null이면 "프로필 먼저 저장" 안내
  data: T[];                    // 해당 탭의 데이터
  setData: (data: T[]) => void; // state setter
  // + 탭별 추가 props
}
```

---

## 2. 핵심 컴포넌트 상세 설계

### 2-1. `add-item-dialog.tsx` — 공통 추가 모달

prompt() 4곳을 대체하는 핵심 컴포넌트.

```tsx
// Dialog는 @base-ui/react 기반 — open prop 사용
interface FieldConfig {
  name: string;
  label: string;
  type: "text" | "select" | "date" | "number" | "checkbox";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: string | number | boolean;
}

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FieldConfig[];
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}
```

**UI 구조:**
```
┌─────────────────────────────────┐
│ [Title]                     [X] │
│ [Description]                   │
│─────────────────────────────────│
│ [Label]  [Input/Select/Date]    │
│ [Label]  [Input/Select/Date]    │
│ [Label]  [Input/Select/Date]    │
│─────────────────────────────────│
│              [취소]  [추가] │
└─────────────────────────────────┘
```

**동작:**
- open 시 필드 defaultValue로 초기화
- Submit 시 로딩 state + onSubmit 호출
- 성공 시 자동 닫기, 실패 시 toast.error
- required 필드 빈 값 시 버튼 disabled

**사용처 4곳:**

| 사용처 | title | fields |
|--------|-------|--------|
| 교과목 | "교과목 추가" | school_name, year, semester, course_name, category, credits |
| 어학시험 | "어학시험 추가" | test_name(select), language, score, level, test_date, test_location(select), cert_number, is_primary(checkbox) |
| 자격증 | "자격증 추가" | cert_name, cert_level, acquired_date, cert_number, issuer |
| 수상 | "수상경력 추가" | title, organization, award_date, description |

---

### 2-2. `basic-info-extended.tsx` — 추가 인적사항

```tsx
interface BasicInfoExtendedProps {
  nameEn: string;
  setNameEn: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  phoneSecondary: string;
  setPhoneSecondary: (v: string) => void;
}
```

**필드:**
- 영문명: 성/명 분리 Input 2칸 (grid-cols-2)
- 주소: 단일 Input
- 보조 연락처: Input (010-0000-0000 placeholder)

---

### 2-3. `military-form.tsx` — 병역사항

```tsx
interface MilitaryFormProps {
  value: MilitaryService;
  onChange: (v: MilitaryService) => void;
}
```

**삼성 실측 옵션:**
```ts
const MILITARY_STATUS = [
  { value: "completed", label: "복무완료(병역필)/복무중(완료예정)" },
  { value: "not_served", label: "미필" },
  { value: "not_applicable", label: "비대상" },
  { value: "exempted", label: "면제" },
];

const DISCHARGE_TYPE = [
  "만기제대", "공익근무소집해제", "군복무중", "명예제대", "방위소집해제",
  "예편", "의가사제대", "의병제대", "소집해제", "상이제대",
  "특례보충역", "특례복무중", "제대기타",
];

const BRANCH = ["육군", "해군", "공군", "해병", "전경", "의경", "국제협력단", "의무소방"];

const RANK = [
  "계급없음", "이병", "일병", "상병", "병장",
  "하사", "중사", "상사", "원사", "준위",
  "소위", "중위", "대위", "소령", "중령", "대령",
];
```

**조건부 렌더링:**
- status === "completed" 일 때만: 병역구분, 군별, 계급, 복무기간, 주요활동사항 표시

---

### 2-4. `education-tab.tsx` — 학력 탭

```tsx
interface EducationTabProps {
  education: Education[];
  setEducation: (v: Education[]) => void;
  academicNote: string;
  setAcademicNote: (v: string) => void;
}
```

**구조:**
```
┌─ 고등학교 ───────────────────────────────┐
│ 학교명 [Input+Search] 졸업구분 [Select]   │
│ 재학기간 [YYYY-MM] ~ [YYYY-MM]            │
└───────────────────────────────────────────┘

┌─ 대학/대학원 ─────────────────────────────┐
│ [+ 학력 추가] 버튼                        │
│                                            │
│ ┌ Card ──────────────────────────────────┐│
│ │ 학교명  학위  졸업구분  전공계열        ││
│ │ 전공명  학위구분  단과대학              ││
│ │ 입학 ~ 졸업   GPA [3.9]/[4.5]          ││
│ │ 복수전공  학번  편입여부                ││
│ │              [수정] [삭제]              ││
│ └────────────────────────────────────────┘│
└───────────────────────────────────────────┘

┌─ 학업과정 중 특기사항 ───────────────────┐
│ [Textarea 100자]                    0/100  │
└───────────────────────────────────────────┘
```

**삼성 Select 옵션:**
```ts
const DEGREE_OPTIONS = ["박사", "석사", "학사", "전문학사"];
const GRADUATION_STATUS_UNIVERSITY = ["졸업예정", "졸업", "수료", "중퇴"];
const GRADUATION_STATUS_HIGHSCHOOL = ["졸업예정", "졸업", "수료", "중퇴", "검정고시"];

const MAJOR_CATEGORY = [
  "건축", "기계", "디자인", "물리", "법학", "산공", "상경", "생물",
  "섬유/고분자", "수학", "식품", "신방", "어문", "예체능", "의약학",
  "이공기타", "인문기타", "재료/금속", "전기전자(HW)", "전기전자(SW)",
  "전산/컴퓨터", "조선/해양", "토목", "통계(이공)", "통계(인문)",
  "행정", "화학/화공", "환경/안전", "MBA",
];

const DEGREE_TYPE = ["주전공", "부전공", "복수학위", "복수전공"];
const GPA_SCALE = ["4.5", "4.3", "4.0", "100"];
```

**고교 분리 로직:**
- `education` 배열에서 `level === "high_school"` → 고교 섹션
- 나머지 → 대학 섹션
- 고교가 없으면 "고등학교 추가" 버튼 표시

---

### 2-5. `course-tab.tsx` — 이수교과목 탭

```tsx
interface CourseTabProps {
  profileId: string | null;
  courses: Course[];
  setCourses: (v: Course[]) => void;
  education: Education[];   // 학교명 자동 완성용
}
```

**구조:**
```
┌─ 학점 요약 ──────────────────────────────┐
│ [전필 15] [전선 21] [교양 12] [일반 6]    │
└───────────────────────────────────────────┘

┌─ 교과목 테이블 ──────────────────────────┐
│ 과목명     | 구분    | 학점 | 학기    |   │
│────────────┼────────┼──────┼────────┼───│
│ 자료구조   | 전필    | 3    | 2024-1 | 🗑│
│ 알고리즘   | 전선    | 3    | 2024-2 | 🗑│
│                                           │
│ [+ 교과목 추가] ← AddItemDialog           │
└───────────────────────────────────────────┘
```

---

### 2-6. `career-tab.tsx` — 경력 탭

```tsx
interface CareerTabProps {
  profileId: string | null;
  entries: CareerEntry[];
  setEntries: (v: CareerEntry[]) => void;
}
```

**2개 서브섹션:**
1. **직무 관련 경력** — `entry_type` = "career" | "project"
2. **대내외 활동** — `entry_type` = "activity" | "training"

**CareerEntryForm 확장 필드:**
```
┌─ 경력 추가 폼 ──────────────────────────┐
│ 구분 [Select: 경력/프로젝트/역량/경험/활동/연수]
│ 제목* [Input]                              │
│ 회사* [Input]   직무* [Input]             │
│ 부서명 [Input]   소재지 [Input]     ← NEW  │
│ 근무형태 [Select: 정규직/계약/인턴/파트/프리] NEW│
│ ☑ 현재 근무 중                       ← NEW│
│ 기간 [date] ~ [date]                      │
│ 내용* [Textarea]                           │
│ ▶ STAR 구조 (접기/펼치기)                  │
│                                            │
│ (entry_type=activity 일 때)                │
│ 활동구분 [Select: 온라인/교외/국내연수/교내/기타]│
└───────────────────────────────────────────┘
```

---

### 2-7. `language-tab.tsx` — 외국어·자격 탭

```tsx
interface LanguageTabProps {
  profileId: string | null;
  languageTests: LanguageTest[];
  setLanguageTests: (v: LanguageTest[]) => void;
  certifications: Certification[];
  setCertifications: (v: Certification[]) => void;
  awards: Award[];
  setAwards: (v: Award[]) => void;
}
```

**4개 섹션:**

1. **영어회화 필수자격** — `is_primary === true` 레코드
2. **기타 외국어** — `is_primary === false` 레코드
3. **자격증/면허** — certifications 테이블
4. **수상경력** — awards 테이블

**각 섹션 패턴:**
```
┌─ [섹션 제목]                    [+ 추가] ┐
│ ┌ 카드 ────────────────────────────────┐│
│ │ [시험명] [Badge: 언어]               ││
│ │ 점수/등급 · 응시일                   ││
│ │                              [🗑]    ││
│ └──────────────────────────────────────┘│
│ [없으면: "등록된 항목이 없습니다"]       │
└───────────────────────────────────────────┘
```

---

### 2-8. `essay-tab.tsx` / `import-tab.tsx`

**EssayTab:**
```tsx
interface EssayTabProps {
  hobbies: string;
  setHobbies: (v: string) => void;
  roleModel: string;
  setRoleModel: (v: string) => void;
  roleModelReason: string;
  setRoleModelReason: (v: string) => void;
}
```

**ImportTab:**
기존 profile/page.tsx의 import 섹션을 그대로 추출.

---

## 3. 삭제 패턴 통일

모든 삭제 동작에 적용하는 공통 패턴:

```tsx
async function handleDelete(
  apiPath: string,
  id: string,
  itemName: string,
  setData: React.Dispatch<React.SetStateAction<T[]>>
) {
  if (!confirm(`"${itemName}"을(를) 삭제하시겠습니까?`)) return;
  try {
    await api.delete(`${apiPath}/${id}`);
    setData((prev) => prev.filter((item) => item.id !== id));
    toast.success("삭제되었습니다.");
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "삭제에 실패했습니다.");
  }
}
```

적용 대상: 교과목, 어학시험, 자격증, 수상, 경력, 학력

---

## 4. 구현 순서 (10 Steps)

| Step | 파일 | 내용 | 의존성 |
|------|------|------|--------|
| 1 | `add-item-dialog.tsx` | 공통 모달 컴포넌트 | shadcn Dialog |
| 2 | `basic-info-extended.tsx` | 영문명/주소/보조전화 | - |
| 3 | `military-form.tsx` | 병역사항 (삼성 실측 옵션) | - |
| 4 | `education-tab.tsx` | 고교 분리 + 대학 카드 + academic_note | 삼성 옵션 상수 |
| 5 | `course-tab.tsx` | 교과목 테이블 + 모달 + 요약 | add-item-dialog |
| 6 | `career-entry-form.tsx` | 확장 필드 추가 | - |
| 7 | `career-tab.tsx` | 경력 + 대내외활동 | career-entry-form |
| 8 | `language-tab.tsx` | 4섹션 + 필수자격 + 모달 | add-item-dialog |
| 9 | `essay-tab.tsx` + `import-tab.tsx` | Essay + 가져오기 분리 | - |
| 10 | `app/profile/page.tsx` | 오케스트레이터 리라이트 | 모든 탭 컴포넌트 |

---

## 5. 파일 목록

| 구분 | 파일 경로 | 줄 수 (예상) |
|------|----------|-------------|
| NEW | `frontend/components/profile/add-item-dialog.tsx` | ~120 |
| NEW | `frontend/components/profile/basic-info-extended.tsx` | ~60 |
| NEW | `frontend/components/profile/military-form.tsx` | ~150 |
| NEW | `frontend/components/profile/education-tab.tsx` | ~350 |
| NEW | `frontend/components/profile/course-tab.tsx` | ~200 |
| NEW | `frontend/components/profile/career-tab.tsx` | ~150 |
| NEW | `frontend/components/profile/language-tab.tsx` | ~300 |
| NEW | `frontend/components/profile/essay-tab.tsx` | ~80 |
| NEW | `frontend/components/profile/import-tab.tsx` | ~150 |
| MODIFY | `frontend/components/profile/career-entry-form.tsx` | +50 |
| REWRITE | `frontend/app/profile/page.tsx` | ~200 (from 1600) |

---

## 6. 검증 체크리스트

```
[ ] TypeScript: npx tsc --noEmit 통과
[ ] prompt() 사용 0건 (grep -r "prompt(" 결과 없음)
[ ] 모든 삭제에 confirm + try/catch
[ ] 기본정보 탭: 영문명/주소/병역 저장 확인
[ ] 학력 탭: 고교 분리, GPA, 전공계열 30개 Select, 졸업구분 Select
[ ] 이수교과목: Dialog 모달로 추가, 학점 요약 카드
[ ] 경력: employment_type, department, location, 활동구분 Select
[ ] 외국어·자격: 필수자격(is_primary), Dialog 모달 추가
[ ] Essay: 취미/존경인물 저장
[ ] profile/page.tsx 200줄 이내
```
