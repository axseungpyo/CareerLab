"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Resume } from "@/lib/types";

interface AnswerFeedback {
  question: string;
  candidate_answer: string;
  score: number;
  feedback: string;
  model_answer: string;
}

interface SessionWithEval {
  id: string;
  mode: string;
  resume_id: string;
  overall_score: number | null;
  evaluation: {
    answer_feedback?: AnswerFeedback[];
  } | null;
  created_at: string;
}

interface WeakPoint extends AnswerFeedback {
  session_id: string;
  session_date: string;
  mode: string;
}

const WEAK_THRESHOLD = 6;

const CATEGORY_GUESS: Record<string, string> = {};

export default function WeakPointsPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState("");
  const [weakPoints, setWeakPoints] = useState<WeakPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    api.get<Resume[]>("/api/resume").then(setResumes).catch(() => {});
  }, []);

  async function handleResumeSelect(resumeId: string) {
    setSelectedResume(resumeId);
    setLoading(true);
    setWeakPoints([]);
    try {
      const sessions = await api.get<SessionWithEval[]>(
        `/api/interview/mock/sessions/${resumeId}`
      );
      const points: WeakPoint[] = [];
      for (const s of sessions) {
        if (!s.evaluation?.answer_feedback) continue;
        for (const fb of s.evaluation.answer_feedback) {
          if (fb.score <= WEAK_THRESHOLD) {
            points.push({
              ...fb,
              session_id: s.id,
              session_date: s.created_at,
              mode: s.mode,
            });
          }
        }
      }
      points.sort((a, b) => a.score - b.score);
      setWeakPoints(points);
    } catch {
      toast.error("세션 데이터를 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(index: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <h1 className="text-2xl font-bold">오답노트</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/interview/compare">
            <Button variant="outline" size="sm">세션 비교</Button>
          </Link>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        모의면접에서 {WEAK_THRESHOLD}점 이하로 평가된 답변을 모아 복습합니다.
      </p>

      {/* Resume Selection */}
      <Card>
        <CardContent className="pt-6">
          <Select value={selectedResume} onValueChange={(v) => v && handleResumeSelect(v)}>
            <SelectTrigger>
              <SelectValue placeholder="자소서 선택" />
            </SelectTrigger>
            <SelectContent>
              {resumes.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading && (
        <div className="text-center py-8 text-muted-foreground">분석 중...</div>
      )}

      {!loading && selectedResume && weakPoints.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              약점 답변이 없습니다! 모든 답변이 {WEAK_THRESHOLD}점을 넘었습니다.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Weak Points List */}
      {weakPoints.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">
            총 {weakPoints.length}개 약점 답변 (점수 낮은 순)
          </p>
          {weakPoints.map((wp, i) => {
            const isOpen = expanded.has(i);
            return (
              <Card key={i} className="border-orange-200 dark:border-orange-900/50">
                <CardHeader
                  className="py-3 cursor-pointer"
                  onClick={() => toggleExpand(i)}
                >
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className={cn(
                        "w-7 h-7 rounded flex items-center justify-center text-xs font-bold shrink-0",
                        wp.score <= 3
                          ? "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400"
                          : "bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400"
                      )}>
                        {wp.score}
                      </div>
                      <span className="truncate">{wp.question}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px]">
                        {wp.mode === "normal" ? "일반" : wp.mode === "pressure" ? "압박" : "PT"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(wp.session_date).toLocaleDateString("ko-KR")}
                      </span>
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </CardTitle>
                </CardHeader>
                {isOpen && (
                  <CardContent className="pt-0 space-y-3 text-sm">
                    <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 border border-red-100 dark:border-red-900/30">
                      <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">내 답변</p>
                      <p className="leading-relaxed">{wp.candidate_answer}</p>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-lg p-3 border border-indigo-100 dark:border-indigo-900/30">
                      <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">피드백</p>
                      <p className="leading-relaxed">{wp.feedback}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 border border-green-100 dark:border-green-900/30">
                      <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">모범 답변</p>
                      <p className="leading-relaxed">{wp.model_answer}</p>
                    </div>
                    <div className="flex justify-end">
                      <Link href={`/interview/mock?resume_id=${selectedResume}`}>
                        <Button size="sm" variant="outline">다시 연습하기</Button>
                      </Link>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
