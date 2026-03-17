# 플랜: 삼성 채용 지원서 양식 분석 → CareerLab 프로필 확장

## Context

삼성그룹 채용 사이트(`samsungcareers.com/resume/modify`) 지원서 양식을 Playwright로 실제 탐색하여 6개 섹션의 모든 필드를 분석했다. 이를 CareerLab 프로필에 반영하여 **실제 대기업 지원서 수준의 데이터를 관리**하고, 자소서 생성 시 더 풍부한 맥락을 제공한다.

---

## 삼성 지원서 6개 섹션 — 실제 필드 분석

### 1. 기본인적사항

| 필드 | 필수 | CareerLab 현재 | 갭 |
|------|------|---------------|-----|
| 지원자명 (국문 성/명) | * | `profiles.name` | 있음 (성/명 분리 불필요) |
| 지원자명 (영문 성/명) | * | — | **추가** |
| 장애여부 | * | — | 스킵 (민감) |
| 보훈가점여부 | * | — | 스킵 (민감) |
| 기초생활수급권자/차상위계층 | * | — | 스킵 (민감) |
| 주소 (우편번호 + 상세) | * | — | **추가** |
| 휴대폰 번호 | * | `profiles.phone` | 있음 |
| 전화번호 | * | — | **추가** (선택적) |

### 2. 학력사항

**고등학교:**
| 필드 | 필수 | CareerLab 현재 | 갭 |
|------|------|---------------|-----|
| 학교명 | * | — (대학만) | **추가** |
| 졸업구분 (졸업/재학/휴학 등) | * | — | **추가** |
| 재학기간 (YYYY-MM ~ YYYY-MM) | * | — | **추가** |

**대학/대학원 (테이블 행 추가 방식):**
| 필드 | 필수 | CareerLab 현재 | 갭 |
|------|------|---------------|-----|
| 학력 (전문학사/학사/석사/박사) | * | `education[].degree` | 있음 |
| 학교소재국가 | * | — | **추가** |
| 학교명 (검색) | * | `education[].school` | 있음 |
| 졸업구분 (졸업/재학/휴학/졸업예정/중퇴/수료) | * | — | **추가** |
| 전공계열 (법학/상경/인문기타/이공기타 등) | * | — | **추가** |
| 전공명 (검색) | * | `education[].major` | 있음 |
| 입학년월 / 졸업년월 | * | `education[].period` (문자열) | **구조화 필요** |
| 학위구분 (주전공/복수전공/부전공) | * | — | **추가** |
| 단과대학 | | — | **추가** |
| 학번 | | — | 선택적 |
| 학점유형 (4.5/4.3/4.0/100점) | * | — | **추가** |
| 평점 / 만점 | * | — | **추가** |

**학업과정 중 특기사항** (100자 텍스트):
| 필드 | | CareerLab | 갭 |
|------|--|-----------|-----|
| 특기사항 | | — | **추가** |

### 3. 이수교과목 (**완전 신규**)

**학교별 교과목 등록 테이블:**
| 필드 | CareerLab | 갭 |
|------|-----------|-----|
| 학교명(학위) | — | **신규** |
| 이수년도 | — | **신규** |
| 학기 (1학기/2학기/하계/동계) | — | **신규** |
| 과목명 | — | **신규** |
| 학점유형 (전필/전선/교양/일반) | — | **신규** |
| 학점 (숫자) | — | **신규** |
| 이수구분 (P/F 여부) | — | **신규** |

> 삼성 직무적합성평가 핵심: **"전공 이수 과목의 수와 난이도, 취득 성적 등 전공 능력을 종합 평가"**

### 4. 경력사항

**병역사항:**
| 필드 | 필수 | CareerLab | 갭 |
|------|------|-----------|-----|
| 병역사항 (복무완료/미필/비대상/면제) | * | — | **추가** |
| 병역구분 (만기제대/의가사제대 등) | * | — | **추가** |
| 군별구분 (육군/해군/공군/해병대) | * | — | **추가** |
| 제대계급 | * | — | **추가** |
| 병역기간 (YYYY-MM-DD ~ YYYY-MM-DD) | * | — | **추가** |
| 주요활동사항 (100자) | * | — | **추가** |

**직무 관련 경력 (테이블):**
| 필드 | CareerLab | 갭 |
|------|-----------|-----|
| 근무지 | `career_entries.company` | 있음 |
| 현재 근무여부 | — | **추가** |
| 입사일 / 퇴사일 | `period_start/end` | 있음 |
| 소재지 | — | **추가** |
| 부서명 | — | **추가** |
| 직무 | `position` | 있음 |
| 인턴 여부 | — | **추가** (employment_type으로 통합) |
| 경력 상세설명 | `content` | 있음 |

**대내외 활동 (테이블):**
| 필드 | CareerLab | 갭 |
|------|-----------|-----|
| 활동구분 (국내연수/해외연수/동아리/봉사 등) | `entry_type` (유사) | **enum 확장 필요** |
| 활동명 | `title` | 있음 |
| 활동시작 / 활동종료 | `period_start/end` | 있음 |
| 활동상세설명 | `content` | 있음 |

### 5. 외국어/자격사항

**영어회화 필수자격 (OPIc/TOEIC-Speaking):**
| 필드 | 필수 | CareerLab | 갭 |
|------|------|-----------|-----|
| 시험종류 (OPIc/TOEIC-Speaking/없음) | * | — | **신규 테이블** |
| 응시장소 (국내/해외) | * | — | **신규** |
| 자격번호 | * | — | **신규** |
| 어학 등급 / 점수 | * | — | **신규** |
| 응시일자 | * | — | **신규** |

**기타 영어자격 / 중국어자격 / 기타 외국어자격 / 한자자격 (테이블):**
| 필드 | CareerLab | 갭 |
|------|-----------|-----|
| 언어/시험 종류 | — | **신규** |
| 등급 | — | **신규** |
| 점수/만점 | — | **신규** |
| 응시일자 | — | **신규** |
| 응시장소 | — | **신규** |
| 자격번호 | — | **신규** |

**기타 직무관련 자격/면허 (테이블):**
| 필드 | CareerLab | 갭 |
|------|-----------|-----|
| 자격종류 (검색) | — | **신규 테이블** |
| 등급 | — | **신규** |
| 취득일자 | — | **신규** |
| 자격번호 | — | **신규** |
| 발급기관 | — | **신규** |

**직무관련 수상경력 (테이블):**
| 필드 | CareerLab | 갭 |
|------|-----------|-----|
| 수상내용 | — | **신규 테이블** |
| 시상단체 | — | **신규** |
| 수상일자 | — | **신규** |
| 수상내용상세설명 | — | **신규** |

### 6. Essay

| 필드 | CareerLab | 갭 |
|------|-----------|-----|
| 취미/특기 | — | **추가** (profiles) |
| 존경인물 / 존경이유 | — | **추가** (profiles) |
| Essay 문항 1~4 (각 700~1500자) | `resume_items.question/answer/char_limit` | **있음** — 자소서 생성 파이프라인 동일 |

> 삼성화재 2026 상반기 실제 문항:
> 1. 지원 이유 + 입사 후 꿈 (700자)
> 2. 성장과정 + 영향을 끼친 사건/인물 (1500자)
> 3. 사회 이슈 견해 (1000자)
> 4. 직무 관련 경험 + 강점 (1000자)

---

## 구현 계획

### Step 1: DB 마이그레이션 (Supabase MCP)

#### 1-A. `profiles` 컬럼 추가

```sql
ALTER TABLE profiles
  ADD COLUMN name_en TEXT,                    -- 영문명
  ADD COLUMN address TEXT,                    -- 주소
  ADD COLUMN phone_secondary TEXT,            -- 보조 전화번호
  ADD COLUMN military_service JSONB DEFAULT '{}',  -- 병역사항
  ADD COLUMN hobbies TEXT,                    -- 취미/특기
  ADD COLUMN role_model TEXT,                 -- 존경인물
  ADD COLUMN role_model_reason TEXT,          -- 존경이유
  ADD COLUMN academic_note TEXT;              -- 학업과정 중 특기사항
```

`military_service` JSONB 구조:
```json
{
  "status": "completed",
  "discharge_type": "만기제대",
  "branch": "육군",
  "rank": "병장",
  "period_start": "2017-05-16",
  "period_end": "2019-02-05",
  "note": "2018 평창올림픽 파견 봉사"
}
```

#### 1-B. `education` JSONB 스키마 확장

```json
{
  "school": "아주대",
  "major": "사학",
  "major_category": "인문기타",
  "degree": "학사",
  "degree_type": "주전공",
  "minor": null,
  "double_major": "경영학",
  "college": "인문",
  "country": "대한민국",
  "gpa": "3.9",
  "gpa_scale": "4.5",
  "gpa_type": "4.5점만점",
  "graduation_status": "졸업예정",
  "period_start": "2021-03",
  "period_end": "2026-08",
  "student_id": "201923794",
  "is_transfer": false,
  "level": "university"
}
```
> 고등학교도 `level: "high_school"`로 동일 배열에 저장

#### 1-C. 신규 테이블: `courses`

```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school_name TEXT NOT NULL,          -- 학교명(학위)
  year INTEGER,                       -- 이수년도
  semester TEXT CHECK (semester IN ('1', '2', 'summer', 'winter')),
  course_name TEXT NOT NULL,          -- 과목명
  category TEXT NOT NULL CHECK (category IN ('major_required', 'major_elective', 'general', 'other')),
  credits INTEGER,                    -- 학점
  pass_fail BOOLEAN DEFAULT false,    -- P/F 여부
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_courses_profile ON courses(profile_id);
```

#### 1-D. 신규 테이블: `language_tests`

```sql
CREATE TABLE language_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT '영어',
  test_name TEXT NOT NULL,            -- OPIc, TOEIC, TOEIC-Speaking, TOEFL, TEPS, JPT, HSK 등
  score TEXT,                         -- 점수
  level TEXT,                         -- 등급 (IL, IM, IH, AL 등)
  max_score TEXT,                     -- 만점
  test_date DATE,                     -- 응시일자
  test_location TEXT DEFAULT '국내',   -- 응시장소
  cert_number TEXT,                   -- 자격번호
  is_primary BOOLEAN DEFAULT false,   -- 영어회화 필수자격 여부
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_language_tests_profile ON language_tests(profile_id);
```

#### 1-E. 신규 테이블: `certifications`

```sql
CREATE TABLE certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cert_name TEXT NOT NULL,            -- 자격종류
  cert_level TEXT,                    -- 등급
  acquired_date DATE,                 -- 취득일자
  cert_number TEXT,                   -- 자격번호
  issuer TEXT,                        -- 발급기관
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_certifications_profile ON certifications(profile_id);
```

#### 1-F. 신규 테이블: `awards`

```sql
CREATE TABLE awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,                -- 수상내용
  organization TEXT,                  -- 시상단체
  award_date DATE,                   -- 수상일자
  description TEXT,                   -- 수상내용상세설명
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_awards_profile ON awards(profile_id);
```

#### 1-G. `career_entries` 확장

```sql
ALTER TABLE career_entries
  ADD COLUMN employment_type TEXT CHECK (
    employment_type IN ('full_time', 'contract', 'intern', 'part_time', 'freelance')
  ),
  ADD COLUMN department TEXT,           -- 부서명
  ADD COLUMN location TEXT,             -- 소재지
  ADD COLUMN is_current BOOLEAN DEFAULT false,  -- 현재 근무여부
  ADD COLUMN activity_category TEXT;    -- 대내외 활동구분
```

`entry_type` CHECK 제약조건 확장:
```sql
ALTER TABLE career_entries DROP CONSTRAINT career_entries_entry_type_check;
ALTER TABLE career_entries ADD CONSTRAINT career_entries_entry_type_check
  CHECK (entry_type IN ('career', 'project', 'skill', 'story', 'activity', 'training'));
```

### Step 2: 백엔드 모델 + API

**수정: `backend/modules/profile/models.py`**
- `EducationItem` 확장 (13개 필드 추가)
- `ProfileCreate/Update/Response` 확장 (name_en, address, phone_secondary, military_service, hobbies, role_model, role_model_reason, academic_note)
- **신규**: `CourseCreate`, `CourseResponse`
- **신규**: `LanguageTestCreate`, `LanguageTestResponse`
- **신규**: `CertificationCreate`, `CertificationResponse`
- **신규**: `AwardCreate`, `AwardResponse`
- `CareerEntryCreate` 확장 (employment_type, department, location, is_current, activity_category)

**수정: `backend/modules/profile/repository.py`**
- courses, language_tests, certifications, awards 각각 CRUD

**수정: `backend/api/routes/profile.py`**
- 신규 엔드포인트 8개:
  - `GET/POST /api/profile/courses/{profile_id}`, `DELETE /api/profile/courses/item/{id}`
  - `GET/POST /api/profile/languages/{profile_id}`, `DELETE /api/profile/languages/item/{id}`
  - `GET/POST /api/profile/certifications/{profile_id}`, `DELETE /api/profile/certifications/item/{id}`
  - `GET/POST /api/profile/awards/{profile_id}`, `DELETE /api/profile/awards/item/{id}`

### Step 3: 프론트엔드 타입 + 프로필 페이지

**수정: `frontend/lib/types.ts`**
- `Profile` 확장 + `Education` 확장
- **신규**: `Course`, `LanguageTest`, `Certification`, `Award`

**수정: `frontend/app/profile/page.tsx`**
- **4탭 → 7탭** 전환:

```
[기본정보] [학력] [이수교과목] [경력] [외국어·자격] [Essay] [가져오기]
```

### Step 4: 기본정보 탭 확장

추가 필드:
- 영문명 (성/명 2칸)
- 주소 (텍스트)
- 보조 전화번호 (선택적)
- 병역사항 (접기/펼치기 카드):
  - 병역사항 Select (복무완료/미필/비대상/면제)
  - 군별 Select (육군/해군/공군/해병대)
  - 계급 Select
  - 복무기간 (date ~ date)
  - 주요활동사항 (100자)

### Step 5: 학력 탭 고도화

- 고등학교 섹션 분리 (학교명/졸업구분/재학기간)
- 대학 테이블 → 카드 리스트:
  - 학위구분 (주전공/복수전공/부전공) Select
  - 전공계열 Select
  - 학교소재국가 Select
  - GPA: 평점 Input + 만점 Select (4.5/4.3/4.0/100)
  - 졸업구분 Select (졸업/재학/휴학/졸업예정/중퇴/수료)
  - 단과대학 Input
- 학업과정 중 특기사항 Textarea (100자)

### Step 6: 이수교과목 탭 (신규)

- 학교별 그룹 분리 (여러 학교 시 탭 또는 Select)
- 테이블 UI: 이수년도, 학기, 과목명, 학점유형(전필/전선/교양/일반), 학점, P/F
- 행 추가/삭제 버튼
- 하단 요약 카드: 전공필수 N학점, 전공선택 N학점, 교양 N학점, 총 N학점

### Step 7: 경력사항 탭 확장

- 직무 관련 경력: 근무지, 현재근무여부, 부서명, 소재지, 인턴여부 추가
- 대내외 활동: 활동구분 Select (국내연수/해외연수/동아리/봉사/커뮤니티/기타)
- `entry_type` 확장: `activity`, `training` 추가

### Step 8: 외국어·자격 탭 (신규)

4개 서브 카드:
1. **영어회화 필수자격** — OPIc/TOEIC-Speaking Select, 등급, 응시일, 자격번호
2. **기타 외국어** — 테이블 (언어, 시험종류, 등급, 점수/만점, 응시일)
3. **자격/면허** — 테이블 (자격종류, 등급, 취득일, 자격번호, 발급기관)
4. **수상경력** — 테이블 (수상내용, 시상단체, 수상일, 상세설명)

### Step 9: Essay 탭

- 취미/특기, 존경인물/이유 입력 필드
- 기존 자소서 생성 페이지(`/resume/new`) 연결 버튼
- 또는 직접 문항 + 답변 작성 가능 (글자수 카운터 포함)

### Step 10: 자소서 생성 프롬프트 연동

**수정: `backend/config/prompts/resume_gen.yaml`**
- 프롬프트 변수에 추가: courses, languages, certifications, awards, military, activities
- 이수교과목 → 전공 역량/학업 성실도 근거
- 외국어/자격 → 자격요건 매칭 근거
- 수상/활동 → 차별화 포인트 근거

---

## 파일 요약

| 구분 | 파일 | 변경 |
|------|------|------|
| DB | Supabase migration | profiles 8컬럼 추가, courses/language_tests/certifications/awards 4테이블 신규, career_entries 5컬럼 추가 |
| 백엔드 | `modules/profile/models.py` | EducationItem 13필드 확장, Profile 8필드 확장, 신규 모델 4종(Course/LanguageTest/Certification/Award), CareerEntry 5필드 확장 |
| 백엔드 | `modules/profile/repository.py` | 4개 신규 테이블 CRUD |
| 백엔드 | `modules/profile/service.py` | 서비스 메서드 추가 |
| 백엔드 | `api/routes/profile.py` | 엔드포인트 8개 추가 |
| 프론트 | `lib/types.ts` | 타입 4종 신규 + 기존 확장 |
| 프론트 | `app/profile/page.tsx` | 4탭→7탭, 모든 탭 UI |
| 프론트 | 신규 컴포넌트 | course-table, language-form, certification-form, award-form, military-form |
| 백엔드 | `config/prompts/resume_gen.yaml` | 프롬프트 변수 확장 |

## 구현 순서

```
Step 1:  DB 마이그레이션 (Supabase MCP)
Step 2:  백엔드 모델 + Repository + Service + API
Step 3:  프론트 타입 확장
Step 4:  기본정보 탭 확장 (영문명/주소/병역)
Step 5:  학력 탭 고도화 (고교 분리, GPA, 졸업구분, 전공계열)
Step 6:  이수교과목 탭 신규
Step 7:  경력사항 탭 확장 (부서명/소재지/대내외활동)
Step 8:  외국어·자격 탭 신규
Step 9:  Essay 탭 (취미/존경인물 + 자소서 연결)
Step 10: 자소서 생성 프롬프트 연동
```

## 검증

```bash
# DB
supabase MCP → list_tables, execute_sql 확인

# 백엔드
cd backend && python -m pytest tests/ -v
curl 테스트: courses, languages, certifications, awards CRUD

# 프론트
cd frontend && npx tsc --noEmit

# E2E
# /profile → 7탭 표시
# 기본정보 → 병역사항 입력/저장
# 학력 → 고교 + 대학(GPA/졸업구분) 저장
# 이수교과목 → 행 추가/삭제 + 학점 요약
# 경력 → 대내외활동 추가
# 외국어·자격 → 어학/자격증/수상 추가
# Essay → 취미/존경인물 저장
# 자소서 생성 → 신규 데이터가 프롬프트에 반영 확인
```
