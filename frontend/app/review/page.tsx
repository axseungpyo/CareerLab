"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Check } from "lucide-react";
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
import { cn } from "@/lib/utils";
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
  const [showDiff, setShowDiff] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());

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
    setShowDiff(false);
    setSelectedSuggestions(new Set());
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

  async function handleApplyAll() {
    if (!report) return;
    try {
      await api.post(`/api/interview/review/apply/${report.id}`, {});
      toast.success("전체 수정본이 적용되었습니다.");
      // Refresh items
      if (selectedResume) {
        const updated = await api.get<ResumeItem[]>(`/api/resume/${selectedResume}/items`);
        setItems(updated);
      }
    } catch (e) {
      toast.error("적용 실패: " + (e instanceof Error ? e.message : ""));
    }
  }

  async function handleApplySelective() {
    if (!report || selectedSuggestions.size === 0) return;
    try {
      await api.post(`/api/interview/review/apply-selective/${report.id}`, {
        indices: Array.from(selectedSuggestions),
      });
      toast.success(`${selectedSuggestions.size}개 제안이 적용되었습니다.`);
      setSelectedSuggestions(new Set());
      if (selectedResume) {
        const updated = await api.get<ResumeItem[]>(`/api/resume/${selectedResume}/items`);
        setItems(updated);
      }
    } catch (e) {
      toast.error("적용 실패: " + (e instanceof Error ? e.message : ""));
    }
  }

  function toggleSuggestion(index: number) {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  const currentItem = items.find((i) => i.id === selectedItem);

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
              <Select value={selectedResume} onValueChange={(v) => { if (v) { setSelectedResume(v); setSelectedItem(""); setReport(null); } }}>
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
              <Select value={selectedItem} onValueChange={(v) => { if (v) { setSelectedItem(v); setReport(null); } }}>
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
                {Object.entries(report.analysis as Record<string, string>).map(([axis, text]) => (
                  <div key={axis}>
                    <p className="text-sm font-medium capitalize">{axis}</p>
                    <p className="text-sm text-muted-foreground">{text}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Suggestions with selective apply */}
          {report.suggestions && (report.suggestions as Record<string, unknown>[]).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>수정 제안</span>
                  {selectedSuggestions.size > 0 && (
                    <Button size="sm" onClick={handleApplySelective}>
                      <Check className="h-3.5 w-3.5 mr-1" />
                      선택 적용 ({selectedSuggestions.size}개)
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(report.suggestions as Record<string, string>[]).map((s, i) => (
                  <div
                    key={i}
                    className={cn(
                      "border rounded-lg p-3 space-y-1 cursor-pointer transition-colors",
                      selectedSuggestions.has(i)
                        ? "border-primary bg-primary/5"
                        : "hover:border-muted-foreground/30"
                    )}
                    onClick={() => toggleSuggestion(i)}
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{s.type}</Badge>
                      <div className={cn(
                        "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                        selectedSuggestions.has(i)
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      )}>
                        {selectedSuggestions.has(i) && <Check className="h-3 w-3" />}
                      </div>
                    </div>
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

          {/* Revised Text with Diff View */}
          {report.revised_text && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    수정본
                    <button
                      onClick={() => setShowDiff(!showDiff)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showDiff ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {showDiff ? "수정본만 보기" : "비교 보기"}
                    </button>
                  </div>
                  <Button size="sm" onClick={handleApplyAll}>
                    전체 적용
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {showDiff && currentItem ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">원문 (v{currentItem.version})</p>
                      <div className="text-sm whitespace-pre-wrap leading-relaxed bg-red-50 dark:bg-red-950/30 p-4 rounded-md border border-red-200 dark:border-red-900">
                        {currentItem.answer}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">수정본</p>
                      <div className="text-sm whitespace-pre-wrap leading-relaxed bg-green-50 dark:bg-green-950/30 p-4 rounded-md border border-green-200 dark:border-green-900">
                        {report.revised_text}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed bg-green-50 dark:bg-green-950 p-4 rounded-md">
                    {report.revised_text}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
