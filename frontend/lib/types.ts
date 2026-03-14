/**
 * Shared TypeScript types for CareerLab frontend.
 */

export interface Profile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  education?: Education[];
  summary?: string;
  career_goal?: string;
  core_values?: string[];
  created_at: string;
  updated_at: string;
}

export interface Education {
  school: string;
  major: string;
  degree: string;
  period: string;
}

export interface CareerEntry {
  id: string;
  profile_id: string;
  entry_type: "career" | "project" | "skill" | "story";
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
  created_at: string;
  updated_at: string;
}

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
