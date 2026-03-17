# 04. 데이터베이스 스키마 (Supabase)

## pgvector 활성화

```sql
create extension if not exists vector;
```

## 테이블 설계

### profiles — 기본 정보

```sql
create table profiles (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text,
  phone text,
  education jsonb,          -- [{school, major, degree, period}]
  summary text,             -- 한줄 자기소개
  career_goal text,         -- 장기 목표
  core_values text[],       -- 핵심 가치관
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### career_entries — 경력/프로젝트/역량 (벡터 포함)

```sql
create table career_entries (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references profiles(id) on delete cascade,
  entry_type text not null check (entry_type in ('career','project','skill','story')),
  
  -- 공통
  title text not null,
  content text not null,          -- 전체 서술
  period_start date,
  period_end date,
  
  -- 경력 전용
  company text,
  position text,
  
  -- STAR 구조
  star_situation text,
  star_task text,
  star_action text,
  star_result text,
  
  -- 태그/메타
  tags text[],                    -- ['데이터분석', 'Python', '리더십']
  quantified_results jsonb,       -- {"매출증가": "15%", "비용절감": "2억원"}
  
  -- 벡터 임베딩
  embedding vector(1536),
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on career_entries using ivfflat (embedding vector_cosine_ops) with (lists = 100);
```

### company_analyses — 기업 분석 결과

```sql
create table company_analyses (
  id uuid default gen_random_uuid() primary key,
  company_name text not null,
  job_posting_text text,          -- 원본 채용공고
  job_posting_url text,
  
  -- 분석 결과
  requirements jsonb,             -- 요구사항 리스트
  talent_profile jsonb,           -- 인재상/핵심가치
  keywords text[],                -- 직무 키워드
  company_info jsonb,             -- 업종, 규모, 최근 동향
  research_notes text,            -- Claude Desktop 리서치 결과
  
  analyzed_at timestamptz default now()
);
```

### resumes — 자소서

```sql
create table resumes (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references profiles(id),
  company_analysis_id uuid references company_analyses(id),
  title text not null,            -- "삼성전자 DX부문 서비스기획"
  status text default 'draft' check (status in ('draft','final','submitted')),
  result text check (result in ('pass','fail','pending', null)),
  submitted_at date,
  created_at timestamptz default now()
);
```

### resume_items — 자소서 문항별 내용

```sql
create table resume_items (
  id uuid default gen_random_uuid() primary key,
  resume_id uuid references resumes(id) on delete cascade,
  question text not null,         -- 문항
  answer text not null,           -- 답변
  char_limit int,                 -- 글자 수 제한
  tone text,                      -- 진중한/열정적/전문적/친근한
  version int default 1,
  
  -- 매칭된 경력 참조
  matched_entries uuid[],         -- career_entries IDs
  
  created_at timestamptz default now()
);
```

### interview_questions — 면접 예상질문

```sql
create table interview_questions (
  id uuid default gen_random_uuid() primary key,
  resume_id uuid references resumes(id),
  category text not null check (category in (
    'resume_based', 'competency', 'company_fit', 'personality', 'pressure'
  )),
  question text not null,
  answer_guide text,              -- 모범답변 가이드
  difficulty text default 'medium' check (difficulty in ('easy','medium','hard')),
  created_at timestamptz default now()
);
```

### mock_sessions — 모의면접 세션

```sql
create table mock_sessions (
  id uuid default gen_random_uuid() primary key,
  resume_id uuid references resumes(id),
  mode text not null check (mode in ('normal','pressure','pt')),
  status text default 'in_progress' check (status in ('in_progress','completed')),
  overall_score int,              -- 1~100
  evaluation jsonb,               -- 종합 평가 리포트
  started_at timestamptz default now(),
  completed_at timestamptz
);
```

### mock_messages — 모의면접 대화 기록

```sql
create table mock_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references mock_sessions(id) on delete cascade,
  role text not null check (role in ('interviewer','candidate')),
  content text not null,
  feedback jsonb,                 -- 이 답변에 대한 피드백
  score int,                      -- 이 답변 점수
  created_at timestamptz default now()
);
```

### feedback_reports — 첨삭 리포트

```sql
create table feedback_reports (
  id uuid default gen_random_uuid() primary key,
  resume_item_id uuid references resume_items(id),
  
  -- 4축 분석 점수 (1~10)
  structure_score int,
  content_score int,
  expression_score int,
  strategy_score int,
  
  -- 상세 피드백
  analysis jsonb,                 -- 각 축별 상세 분석
  suggestions jsonb,              -- 수정 제안 리스트
  revised_text text,              -- 수정 후 텍스트
  
  created_at timestamptz default now()
);
```

## 시맨틱 검색 함수

```sql
create or replace function match_career_entries(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 5,
  filter_profile_id uuid default null
)
returns table (
  id uuid,
  entry_type text,
  title text,
  content text,
  star_situation text,
  star_action text,
  star_result text,
  tags text[],
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    ce.id, ce.entry_type, ce.title, ce.content,
    ce.star_situation, ce.star_action, ce.star_result,
    ce.tags,
    1 - (ce.embedding <=> query_embedding) as similarity
  from career_entries ce
  where
    (filter_profile_id is null or ce.profile_id = filter_profile_id)
    and 1 - (ce.embedding <=> query_embedding) > match_threshold
  order by ce.embedding <=> query_embedding
  limit match_count;
end;
$$;
```

## RLS (Row Level Security) — 추후 배포 시 활성화

```sql
-- 현재: 로컬 전용이므로 RLS 비활성화
-- 배포 시 아래 정책 적용

alter table profiles enable row level security;
create policy "Users can CRUD own profile"
  on profiles for all
  using (auth.uid() = id);
```
