"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface AnswerFeedback {
  question: string;
  candidate_answer: string;
  score: number;
  feedback: string;
  model_answer: string;
}

interface Evaluation {
  overall_score: number;
  grade: string;
  scores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  answer_feedback: AnswerFeedback[];
  overall_feedback: string;
}

interface SessionData {
  id: string;
  mode: string;
  status: string;
  overall_score: number;
  evaluation: Evaluation;
  created_at: string;
}

const SCORE_LABELS: Record<string, string> = {
  answer_quality: "답변 충실도",
  logic: "논리성",
  expertise: "전문성",
  communication: "소통력",
  adaptability: "대응력",
};

const GRADE_COLORS: Record<string, string> = {
  S: "bg-yellow-500",
  A: "bg-green-500",
  B: "bg-blue-500",
  C: "bg-orange-500",
  D: "bg-red-500",
};

function scoreColor(score: number): string {
  if (score >= 8) return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900";
  if (score >= 5) return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900";
  return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900";
}

export default function InterviewResultPage() {
  const params = useParams();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedAnswers, setExpandedAnswers] = useState<Set<number>>(new Set());

  useEffect(() => {
    api
      .get<SessionData>(`/api/interview/mock/${params.id}`)
      .then(setSession)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  function toggleAnswer(index: number) {
    setExpandedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">로딩 중...</div>;
  }

  if (!session?.evaluation) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        평가 결과를 찾을 수 없습니다.
      </div>
    );
  }

  const eval_ = session.evaluation;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">면접 평가 결과</h1>
        <Badge variant="outline" className="text-xs">
          {session.mode === "normal" ? "일반" : session.mode === "pressure" ? "압박" : "PT"} 모드
        </Badge>
      </div>

      {/* Overall Score Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card border-0">
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold">{eval_.overall_score}</div>
            <div className="text-sm text-muted-foreground mt-1">총점 / 100</div>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="pt-6 text-center">
            <div
              className={cn(
                "inline-block text-3xl font-bold text-white rounded-full w-14 h-14 leading-[3.5rem]",
                GRADE_COLORS[eval_.grade] || "bg-gray-500"
              )}
            >
              {eval_.grade}
            </div>
            <div className="text-sm text-muted-foreground mt-1">등급</div>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="pt-6">
            <div className="space-y-2">
              {Object.entries(eval_.scores || {}).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{SCORE_LABELS[key] || key}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                        style={{ width: `${value * 10}%` }}
                      />
                    </div>
                    <span className="font-semibold w-8 text-right">{value}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strengths / Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="glass-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-600 dark:text-green-400">강점</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-sm space-y-1">
              {eval_.strengths?.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-600 dark:text-red-400">약점</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-sm space-y-1">
              {eval_.weaknesses?.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Overall Feedback */}
      <Card className="glass-card border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">종합 평가</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{eval_.overall_feedback}</p>
        </CardContent>
      </Card>

      {/* Answer-by-Answer Feedback Cards */}
      {eval_.answer_feedback && eval_.answer_feedback.length > 0 && (
        <>
          <Separator />
          <h2 className="text-lg font-semibold">답변별 피드백</h2>
          <div className="space-y-3">
            {eval_.answer_feedback.map((fb, i) => {
              const isExpanded = expandedAnswers.has(i);
              const isWeak = fb.score <= 6;
              return (
                <Card
                  key={i}
                  className={cn(
                    "transition-all",
                    isWeak && "border-red-200 dark:border-red-900/50"
                  )}
                >
                  <CardHeader className="py-3 cursor-pointer" onClick={() => toggleAnswer(i)}>
                    <CardTitle className="text-sm flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="shrink-0">Q{i + 1}.</span>
                        <span className="truncate">{fb.question}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isWeak && (
                          <Badge variant="destructive" className="text-[10px]">
                            약점
                          </Badge>
                        )}
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border",
                          scoreColor(fb.score)
                        )}>
                          {fb.score}
                        </div>
                        {isExpanded
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        }
                      </div>
                    </CardTitle>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent className="pt-0 space-y-4 text-sm">
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">내 답변</p>
                        <p className="leading-relaxed">{fb.candidate_answer}</p>
                      </div>
                      <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-lg p-3 border border-indigo-100 dark:border-indigo-900/30">
                        <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">피드백</p>
                        <p className="leading-relaxed">{fb.feedback}</p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 border border-green-100 dark:border-green-900/30">
                        <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">모범 답변</p>
                        <p className="leading-relaxed">{fb.model_answer}</p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
