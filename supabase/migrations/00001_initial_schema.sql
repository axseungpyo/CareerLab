-- CareerLab 초기 스키마
-- pgvector 활성화
create extension if not exists vector;

-- profiles — 기본 정보
create table profiles (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text,
  phone text,
  education jsonb,
  summary text,
  career_goal text,
  core_values text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- career_entries — 경력/프로젝트/역량 (벡터 포함)
create table career_entries (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references profiles(id) on delete cascade,
  entry_type text not null check (entry_type in ('career','project','skill','story')),
  title text not null,
  content text not null,
  period_start date,
  period_end date,
  company text,
  position text,
  star_situation text,
  star_task text,
  star_action text,
  star_result text,
  tags text[],
  quantified_results jsonb,
  embedding vector(1536),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on career_entries using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- company_analyses — 기업 분석 결과
create table company_analyses (
  id uuid default gen_random_uuid() primary key,
  company_name text not null,
  job_posting_text text,
  job_posting_url text,
  requirements jsonb,
  talent_profile jsonb,
  keywords text[],
  company_info jsonb,
  research_notes text,
  analyzed_at timestamptz default now()
);

-- resumes — 자소서
create table resumes (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references profiles(id),
  company_analysis_id uuid references company_analyses(id),
  title text not null,
  status text default 'draft' check (status in ('draft','final','submitted')),
  result text check (result in ('pass','fail','pending', null)),
  submitted_at date,
  created_at timestamptz default now()
);

-- resume_items — 자소서 문항별 내용
create table resume_items (
  id uuid default gen_random_uuid() primary key,
  resume_id uuid references resumes(id) on delete cascade,
  question text not null,
  answer text not null,
  char_limit int,
  tone text,
  version int default 1,
  matched_entries uuid[],
  created_at timestamptz default now()
);

-- interview_questions — 면접 예상질문
create table interview_questions (
  id uuid default gen_random_uuid() primary key,
  resume_id uuid references resumes(id),
  category text not null check (category in (
    'resume_based', 'competency', 'company_fit', 'personality', 'pressure'
  )),
  question text not null,
  answer_guide text,
  difficulty text default 'medium' check (difficulty in ('easy','medium','hard')),
  created_at timestamptz default now()
);

-- mock_sessions — 모의면접 세션
create table mock_sessions (
  id uuid default gen_random_uuid() primary key,
  resume_id uuid references resumes(id),
  mode text not null check (mode in ('normal','pressure','pt')),
  status text default 'in_progress' check (status in ('in_progress','completed')),
  overall_score int,
  evaluation jsonb,
  started_at timestamptz default now(),
  completed_at timestamptz
);

-- mock_messages — 모의면접 대화 기록
create table mock_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references mock_sessions(id) on delete cascade,
  role text not null check (role in ('interviewer','candidate')),
  content text not null,
  feedback jsonb,
  score int,
  created_at timestamptz default now()
);

-- feedback_reports — 첨삭 리포트
create table feedback_reports (
  id uuid default gen_random_uuid() primary key,
  resume_item_id uuid references resume_items(id),
  structure_score int,
  content_score int,
  expression_score int,
  strategy_score int,
  analysis jsonb,
  suggestions jsonb,
  revised_text text,
  created_at timestamptz default now()
);

-- 시맨틱 검색 함수
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
