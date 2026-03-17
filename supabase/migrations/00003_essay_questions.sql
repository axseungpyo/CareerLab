-- Essay Questions: 기업별 기출문항 관리
CREATE TABLE IF NOT EXISTS essay_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  period TEXT,
  question_number INTEGER NOT NULL,
  question TEXT NOT NULL,
  char_limit INTEGER,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_essay_questions_company ON essay_questions(company_name);

-- 삼성화재 2026 상반기 시드 데이터
INSERT INTO essay_questions (company_name, period, question_number, question, char_limit, category)
VALUES
  ('삼성화재', '2026 상반기', 1, '삼성화재에 지원한 이유와 입사 후 회사에서 이루고 싶은 꿈을 기술하십시오.', 700, '지원동기'),
  ('삼성화재', '2026 상반기', 2, '본인의 성장과정에서 가장 큰 영향을 끼친 사건, 인물 등을 포함하여 기술하십시오.', 1500, '성장과정'),
  ('삼성화재', '2026 상반기', 3, '최근 사회이슈 중 하나를 선택하고, 이에 관한 자신의 견해를 기술하십시오.', 1000, '사회이슈'),
  ('삼성화재', '2026 상반기', 4, '직무와 관련하여 특정 분야의 전문성을 키우기 위해 꾸준히 노력한 경험에 대해 서술하고, 이를 바탕으로 본인이 지원 직무에 적합한 이유를 설명하십시오.', 1000, '직무역량')
ON CONFLICT DO NOTHING;
