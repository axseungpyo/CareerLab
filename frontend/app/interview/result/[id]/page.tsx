"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";

interface Evaluation {
  overall_score: number;
  grade: string;
  scores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  answer_feedback: {
    question: string;
    candidate_answer: string;
    score: number;
    feedback: string;
    model_answer: string;
  }[];
  overall_feedback: string;
}

interface SessionData {
  id: string;
  mode: string;
  status: string;
  overall_score: number;
  evaluation: Evaluation;
}

export default function InterviewResultPage() {
  const params = useParams();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<SessionData>(`/api/interview/mock/${params.id}`)
      .then(setSession)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

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
  const SCORE_LABELS: Record<string, string> = {
    answer_quality: "답변 충실도",
    logic: "논리성",
    expertise: "전문성",
    communication: "소통력",
    adaptability: "대응력",
  };

  const gradeColor: Record<string, string> = {
    S: "bg-yellow-500",
    A: "bg-green-500",
    B: "bg-blue-500",
    C: "bg-orange-500",
    D: "bg-red-500",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">면접 평가 결과</h1>

      {/* Overall Score */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold">{eval_.overall_score}</div>
            <div className="text-sm text-muted-foreground mt-1">총점 / 100</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div
              className={`inline-block text-3xl font-bold text-white rounded-full w-14 h-14 leading-[3.5rem] ${
                gradeColor[eval_.grade] || "bg-gray-500"
              }`}
            >
              {eval_.grade}
            </div>
            <div className="text-sm text-muted-foreground mt-1">등급</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              {Object.entries(eval_.scores || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span>{SCORE_LABELS[key] || key}</span>
                  <span className="font-semibold">{value}/10</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strengths / Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-green-600 dark:text-green-400">강점</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-sm space-y-1">
              {eval_.strengths?.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">종합 평가</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{eval_.overall_feedback}</p>
        </CardContent>
      </Card>

      {/* Answer Feedback */}
      {eval_.answer_feedback && eval_.answer_feedback.length > 0 && (
        <>
          <Separator />
          <h2 className="text-lg font-semibold">답변별 피드백</h2>
          <div className="space-y-4">
            {eval_.answer_feedback.map((fb, i) => (
              <Card key={i}>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Q{i + 1}. {fb.question}</span>
                    <Badge variant="outline">{fb.score}/10</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-muted-foreground">내 답변</p>
                    <p>{fb.candidate_answer}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">피드백</p>
                    <p>{fb.feedback}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">모범 답변</p>
                    <p className="text-green-700 dark:text-green-300">{fb.model_answer}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
