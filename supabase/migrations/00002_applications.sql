-- applications — 지원 현황 트래킹
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  job_title TEXT,
  job_url TEXT,
  stage TEXT NOT NULL DEFAULT 'interested'
    CHECK (stage IN ('interested', 'applied', 'interview', 'result')),
  result TEXT CHECK (result IN ('pass', 'fail', 'pending')),
  deadline TIMESTAMPTZ,
  interview_date TIMESTAMPTZ,
  notes TEXT,
  resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
  company_analysis_id UUID REFERENCES company_analyses(id) ON DELETE SET NULL,
  parsed_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_applications_profile ON applications(profile_id);
CREATE INDEX idx_applications_stage ON applications(stage);
CREATE INDEX idx_applications_deadline ON applications(deadline);
