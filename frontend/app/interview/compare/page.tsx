"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface SessionSummary {
  id: string;
  mode: string;
  status: string;
  overall_score: number | null;
  evaluation: {
    grade?: string;
    scores?: Record<string, number>;
    strengths?: string[];
    weaknesses?: string[];
  } | null;
  created_at: string;
}

const SCORE_LABELS: Record<string, string> = {
  answer_quality: "답변 충실도",
  logic: "논리성",
  expertise: "전문성",
  communication: "소통력",
  adaptability: "대응력",
};

const MODE_LABELS: Record<string, string> = {
  normal: "일반",
  pressure: "압박",
  pt: "PT",
};

export default function InterviewComparePage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState("");
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionA, setSessionA] = useState("");
  const [sessionB, setSessionB] = useState("");

  useEffect(() => {
    api.get<Resume[]>("/api/resume").then(setResumes).catch(() => {});
  }, []);

  async function handleResumeSelect(resumeId: string) {
    setSelectedResume(resumeId);
    setSessionA("");
    setSessionB("");
    try {
      const s = await api.get<SessionSummary[]>(`/api/interview/mock/sessions/${resumeId}`);
      const evaluated = s.filter((x) => x.status === "completed" && x.evaluation);
      setSessions(evaluated);
      if (evaluated.length < 2) {
        toast.info("비교하려면 최소 2개의 완료된 세션이 필요합니다.");
      }
    } catch {
      toast.error("세션 목록을 불러올 수 없습니다.");
    }
  }

  const a = sessions.find((s) => s.id === sessionA);
  const b = sessions.find((s) => s.id === sessionB);

  const chartData = a?.evaluation?.scores && b?.evaluation?.scores
    ? Object.keys(a.evaluation.scores).map((key) => ({
        axis: SCORE_LABELS[key] || key,
        A: a.evaluation!.scores![key],
        B: b.evaluation!.scores![key],
      }))
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">면접 세션 비교</h1>

      {/* Selection */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
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
          </div>
          {sessions.length >= 2 && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">세션 A</p>
                <Select value={sessionA} onValueChange={(v) => v && setSessionA(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="세션 A 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.filter((s) => s.id !== sessionB).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {new Date(s.created_at).toLocaleDateString("ko-KR")} ({MODE_LABELS[s.mode]}) — {s.overall_score}점
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">세션 B</p>
                <Select value={sessionB} onValueChange={(v) => v && setSessionB(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="세션 B 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.filter((s) => s.id !== sessionA).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {new Date(s.created_at).toLocaleDateString("ko-KR")} ({MODE_LABELS[s.mode]}) — {s.overall_score}점
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {a && b && (
        <>
          {/* Score Comparison */}
          <div className="grid grid-cols-2 gap-4">
            <Card className={cn("glass-card border-0", (a.overall_score ?? 0) >= (b.overall_score ?? 0) && "ring-2 ring-green-500/30")}>
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground mb-1">세션 A</p>
                <div className="text-3xl font-bold">{a.overall_score ?? "-"}</div>
                <Badge variant="secondary" className="mt-1">{a.evaluation?.grade ?? "-"}</Badge>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {new Date(a.created_at).toLocaleDateString("ko-KR")} · {MODE_LABELS[a.mode]}
                </p>
              </CardContent>
            </Card>
            <Card className={cn("glass-card border-0", (b.overall_score ?? 0) > (a.overall_score ?? 0) && "ring-2 ring-green-500/30")}>
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground mb-1">세션 B</p>
                <div className="text-3xl font-bold">{b.overall_score ?? "-"}</div>
                <Badge variant="secondary" className="mt-1">{b.evaluation?.grade ?? "-"}</Badge>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {new Date(b.created_at).toLocaleDateString("ko-KR")} · {MODE_LABELS[b.mode]}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 5-axis Chart */}
          {chartData.length > 0 && (
            <Card className="glass-card border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">5축 점수 비교</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="axis" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} width={24} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="A" name="세션 A" fill="oklch(0.58 0.20 270)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="B" name="세션 B" fill="oklch(0.55 0.18 310)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Strengths / Weaknesses Comparison */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">세션 A 강점/약점</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div>
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">강점</p>
                  <ul className="list-disc list-inside text-xs space-y-0.5">
                    {a.evaluation?.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">약점</p>
                  <ul className="list-disc list-inside text-xs space-y-0.5">
                    {a.evaluation?.weaknesses?.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground">세션 B 강점/약점</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div>
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">강점</p>
                  <ul className="list-disc list-inside text-xs space-y-0.5">
                    {b.evaluation?.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">약점</p>
                  <ul className="list-disc list-inside text-xs space-y-0.5">
                    {b.evaluation?.weaknesses?.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
