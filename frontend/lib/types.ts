/**
 * Shared TypeScript types for CareerLab frontend.
 */

// ── Profile ──

export interface MilitaryService {
  status?: string; // completed, in_service, exempted, not_applicable
  discharge_type?: string;
  branch?: string;
  rank?: string;
  period_start?: string;
  period_end?: string;
  note?: string;
}

export interface Profile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  education?: Education[];
  summary?: string;
  career_goal?: string;
  core_values?: string[];
  // Samsung-style extended fields
  name_en?: string;
  name_hanja?: string;
  phone_secondary?: string;
  military_service?: MilitaryService;
  hobbies?: string;
  role_model?: string;
  role_model_reason?: string;
  specialties?: string;
  growth_background?: string;
  personal_values?: string;
  strength_weakness?: string;
  academic_note?: string;
  created_at: string;
  updated_at: string;
}

export interface Education {
  school: string;
  major: string;
  degree: string;
  period?: string;
  // Samsung-style extended fields
  level?: string; // high_school, university, graduate
  major_category?: string;
  degree_type?: string; // 주전공/복수전공/부전공
  minor?: string;
  double_major?: string;
  college?: string;
  country?: string;
  gpa?: string;
  gpa_scale?: string; // 4.5, 4.3, 4.0, 100
  gpa_type?: string;
  graduation_status?: string;
  period_start?: string;
  period_end?: string;
  student_id?: string;
  is_transfer?: boolean;
}

// ── Career Entry ──

export interface CareerEntry {
  id: string;
  profile_id: string;
  entry_type: "career" | "project" | "skill" | "story" | "activity" | "training";
  title: string;
  content: string;
  period_start?: string;
  period_end?: string;
  company?: string;
  position?: string;
  star_situation?: string;
  star_task?: string;
  star_action?: string;
  star_result?: string;
  tags?: string[];
  quantified_results?: Record<string, string>;
  // Samsung-style extended fields
  employment_type?: string;
  department?: string;
  location?: string;
  is_current?: boolean;
  activity_category?: string;
  created_at: string;
  updated_at: string;
}

// ── Course (이수교과목) ──

export interface Course {
  id: string;
  profile_id: string;
  school_name: string;
  year?: number;
  semester?: string; // 1, 2, summer, winter
  course_name: string;
  category: "major_required" | "major_elective" | "general" | "other";
  credits?: number;
  pass_fail: boolean;
  created_at: string;
}

// ── Language Test (외국어) ──

export interface LanguageTest {
  id: string;
  profile_id: string;
  language: string;
  test_name: string;
  score?: string;
  level?: string;
  max_score?: string;
  test_date?: string;
  test_location: string;
  cert_number?: string;
  is_primary: boolean;
  created_at: string;
}

// ── Certification (자격증) ──

export interface Certification {
  id: string;
  profile_id: string;
  cert_name: string;
  cert_level?: string;
  acquired_date?: string;
  cert_number?: string;
  issuer?: string;
  created_at: string;
}

// ── Award (수상경력) ──

export interface Award {
  id: string;
  profile_id: string;
  title: string;
  organization?: string;
  award_date?: string;
  description?: string;
  created_at: string;
}

// ── Essay Questions (기출문항) ──

export interface EssayQuestion {
  id: string;
  company_name: string;
  period?: string;
  question_number: number;
  question: string;
  char_limit?: number;
  category?: string;
}

// ── Company Analysis ──

export interface CompanyAnalysis {
  id: string;
  company_name: string;
  job_posting_text?: string;
  job_posting_url?: string;
  requirements?: string[];
  talent_profile?: Record<string, unknown>;
  keywords?: string[];
  company_info?: Record<string, unknown>;
  research_notes?: string;
  analyzed_at: string;
}

// ── Resume ──

export interface Resume {
  id: string;
  profile_id: string;
  company_analysis_id: string;
  title: string;
  status: "draft" | "final" | "submitted";
  result?: "pass" | "fail" | "pending" | null;
  submitted_at?: string;
  created_at: string;
}

export interface ResumeItem {
  id: string;
  resume_id: string;
  question: string;
  answer: string;
  char_limit?: number;
  tone?: string;
  version: number;
  matched_entries?: string[];
  created_at: string;
}

// ── Interview ──

export interface InterviewQuestion {
  id: string;
  resume_id: string;
  category: "resume_based" | "competency" | "company_fit" | "personality" | "pressure";
  question: string;
  answer_guide?: string;
  difficulty: "easy" | "medium" | "hard";
  created_at: string;
}

export interface MockSession {
  id: string;
  resume_id: string;
  mode: "normal" | "pressure" | "pt";
  status: "in_progress" | "completed";
  overall_score?: number;
  evaluation?: Record<string, unknown>;
  started_at: string;
  completed_at?: string;
}

export interface FeedbackReport {
  id: string;
  resume_item_id: string;
  structure_score: number;
  content_score: number;
  expression_score: number;
  strategy_score: number;
  analysis?: Record<string, unknown>;
  suggestions?: Record<string, unknown>[];
  revised_text?: string;
  created_at: string;
}

// ── Application ──

export interface Application {
  id: string;
  profile_id: string;
  company_name: string;
  job_title: string | null;
  job_url: string | null;
  stage: "interested" | "applied" | "interview" | "result";
  result: "pass" | "fail" | "pending" | null;
  deadline: string | null;
  interview_date: string | null;
  notes: string | null;
  resume_id: string | null;
  company_analysis_id: string | null;
  parsed_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  company_name: string;
  type: "deadline" | "interview";
  date: string;
  stage: string;
}
