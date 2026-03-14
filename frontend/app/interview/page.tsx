"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import type { Resume, InterviewQuestion } from "@/lib/types";

export default function InterviewPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState("");
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Resume[]>("/api/resume")
      .then(setResumes)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSelectResume(resumeId: string) {
    setSelectedResume(resumeId);
    const q = await api.get<InterviewQuestion[]>(
      `/api/interview/questions/${resumeId}`
    );
    setQuestions(q);
  }

  async function handleGenerateQuestions() {
    if (!selectedResume) return;
    setGenerating(true);
    try {
      const q = await api.post<InterviewQuestion[]>(
        "/api/interview/generate-questions",
        { resume_id: selectedResume }
      );
      setQuestions(q);
      toast.success("예상질문이 생성되었습니다.");
    } catch (e) {
      toast.error("질문 생성 실패: " + (e instanceof Error ? e.message : ""));
    } finally {
      setGenerating(false);
    }
  }

  const CATEGORY_LABEL: Record<string, string> = {
    resume_based: "자소서 기반",
    competency: "직무 역량",
    company_fit: "기업 적합",
    personality: "인성/가치관",
    pressure: "압박/돌발",
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">면접 코칭</h1>
        {selectedResume && (
          <Link href={`/interview/mock?resume_id=${selectedResume}`}>
            <Button>모의면접 시작</Button>
          </Link>
        )}
      </div>

      {/* Resume Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">자소서 선택</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 items-end">
          <div className="flex-1">
            <Select value={selectedResume} onValueChange={(v) => v && handleSelectResume(v)}>
              <SelectTrigger>
                <SelectValue placeholder="자소서를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {resumes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleGenerateQuestions}
            disabled={!selectedResume || generating}
          >
            {generating ? "생성 중..." : "예상질문 생성"}
          </Button>
        </CardContent>
      </Card>

      {/* Questions List */}
      {questions.length > 0 && (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <Card key={q.id}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Badge variant="outline">
                    {CATEGORY_LABEL[q.category] || q.category}
                  </Badge>
                  <Badge variant="secondary">{q.difficulty}</Badge>
                  <span className="font-normal">
                    Q{i + 1}. {q.question}
                  </span>
                </CardTitle>
              </CardHeader>
              {q.answer_guide && (
                <CardContent className="py-0 pb-3">
                  <p className="text-sm text-muted-foreground">
                    💡 {q.answer_guide}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
