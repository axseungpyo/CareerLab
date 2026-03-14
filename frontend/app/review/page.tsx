"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import type { Resume, ResumeItem, FeedbackReport } from "@/lib/types";

export default function ReviewPage() {
  const searchParams = useSearchParams();
  const initialResumeId = searchParams.get("resume_id") || "";

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState(initialResumeId);
  const [items, setItems] = useState<ResumeItem[]>([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [report, setReport] = useState<FeedbackReport | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    api.get<Resume[]>("/api/resume").then(setResumes).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedResume) {
      api
        .get<ResumeItem[]>(`/api/resume/${selectedResume}/items`)
        .then(setItems)
        .catch(() => {});
    }
  }, [selectedResume]);

  async function handleAnalyze() {
    const item = items.find((i) => i.id === selectedItem);
    if (!item) return;

    setAnalyzing(true);
    setReport(null);
    try {
      const result = await api.post<FeedbackReport>(
        "/api/interview/review/analyze",
        {
          resume_item_id: item.id,
          question: item.question,
          answer: item.answer,
        }
      );
      setReport(result);
      toast.success("첨삭 분석이 완료되었습니다.");
    } catch (e) {
      toast.error("분석 실패: " + (e instanceof Error ? e.message : ""));
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleApply() {
    if (!report) return;
    try {
      await api.post(`/api/interview/review/apply/${report.id}`, {});
      toast.success("수정본이 적용되었습니다.");
    } catch (e) {
      toast.error("적용 실패: " + (e instanceof Error ? e.message : ""));
    }
  }

  const AXES = [
    { key: "structure_score", label: "구조", color: "text-blue-600 dark:text-blue-400" },
    { key: "content_score", label: "내용", color: "text-green-600 dark:text-green-400" },
    { key: "expression_score", label: "표현", color: "text-purple-600 dark:text-purple-400" },
    { key: "strategy_score", label: "전략", color: "text-orange-600 dark:text-orange-400" },
  ] as const;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">자소서 첨삭</h1>

      {/* Selection */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Select value={selectedResume} onValueChange={(v) => v && setSelectedResume(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="자소서 선택" />
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
            <div>
              <Select value={selectedItem} onValueChange={(v) => v && setSelectedItem(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="문항 선택" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item, i) => (
                    <SelectItem key={item.id} value={item.id}>
                      {i + 1}. {item.question.slice(0, 30)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAnalyze} disabled={!selectedItem || analyzing}>
              {analyzing ? "분석 중..." : "첨삭 분석"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {report && (
        <>
          {/* Scores */}
          <div className="grid grid-cols-4 gap-4">
            {AXES.map(({ key, label, color }) => (
              <Card key={key}>
                <CardContent className="pt-6 text-center">
                  <div className={`text-3xl font-bold ${color}`}>
                    {report[key as keyof FeedbackReport] as number}
                  </div>
                  <div className="text-sm text-muted-foreground">{label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Analysis */}
          {report.analysis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">분석 결과</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(
                  report.analysis as Record<string, string>
                ).map(([axis, text]) => (
                  <div key={axis}>
                    <p className="text-sm font-medium capitalize">{axis}</p>
                    <p className="text-sm text-muted-foreground">{text}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Suggestions */}
          {report.suggestions && (report.suggestions as Record<string, unknown>[]).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">수정 제안</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(report.suggestions as Record<string, string>[]).map((s, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-1">
                    <Badge variant="outline">{s.type}</Badge>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <p className="text-xs text-muted-foreground">원문</p>
                        <p className="text-sm line-through text-red-500 dark:text-red-400">
                          {s.original}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">수정안</p>
                        <p className="text-sm text-green-600 dark:text-green-400">{s.revised}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.reason}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Revised Text */}
          {report.revised_text && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex justify-between items-center">
                  수정본
                  <Button size="sm" onClick={handleApply}>
                    적용하기
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap leading-relaxed bg-green-50 dark:bg-green-950 p-4 rounded-md">
                  {report.revised_text}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
