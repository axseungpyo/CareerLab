"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, FileText, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Application } from "@/lib/types";

const STAGE_LABEL: Record<string, string> = {
  interested: "관심",
  applied: "지원완료",
  interview: "면접",
  result: "결과",
};

const STAGE_COLOR: Record<string, string> = {
  interested: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  applied: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  interview: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  result: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

const RESULT_LABEL: Record<string, string> = {
  pass: "합격",
  fail: "불합격",
  pending: "대기중",
};

function getDday(dateStr: string | null): { text: string; className: string } | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) return { text: `D+${Math.abs(diff)}`, className: "text-muted-foreground" };
  if (diff === 0) return { text: "D-Day", className: "text-red-500 font-bold" };
  if (diff <= 3) return { text: `D-${diff}`, className: "text-red-500 font-semibold" };
  if (diff <= 7) return { text: `D-${diff}`, className: "text-orange-500 font-medium" };
  return { text: `D-${diff}`, className: "text-muted-foreground" };
}

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .get<Application>(`/api/applications/${id}`)
      .then((data) => {
        setApp(data);
        setNotes(data.notes || "");
      })
      .catch(() => toast.error("지원 정보를 불러오지 못했습니다"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleStageChange(newStage: string) {
    if (!app) return;
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      let body: Record<string, string> = { stage: newStage };
      if (newStage === "result") {
        const result = window.prompt("결과를 입력하세요 (pass / fail / pending):", "pending");
        if (!result || !["pass", "fail", "pending"].includes(result)) {
          toast.error("pass, fail, pending 중 하나를 입력해주세요");
          return;
        }
        body = { stage: newStage, result };
      }
      const res = await fetch(`${API_URL}/api/applications/${app.id}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("단계 변경 실패");
      const updated = await res.json();
      setApp(updated);
      toast.success(`단계가 ${STAGE_LABEL[newStage]}(으)로 변경되었습니다`);
    } catch {
      toast.error("단계 변경에 실패했습니다");
    }
  }

  async function handleSaveNotes() {
    if (!app) return;
    setSavingNotes(true);
    try {
      const updated = await api.put<Application>(`/api/applications/${app.id}`, {
        ...app,
        notes,
      });
      setApp(updated);
      toast.success("메모가 저장되었습니다");
    } catch {
      toast.error("메모 저장에 실패했습니다");
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleDelete() {
    if (!app) return;
    const confirmed = window.confirm(`${app.company_name} 지원을 삭제하시겠습니까?`);
    if (!confirmed) return;

    setDeleting(true);
    try {
      await api.delete(`/api/applications/${app.id}`);
      toast.success("삭제되었습니다");
      router.push("/applications");
    } catch {
      toast.error("삭제에 실패했습니다");
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">로딩 중...</div>;
  }

  if (!app) {
    return <div className="text-center py-12 text-muted-foreground">지원 정보를 찾을 수 없습니다</div>;
  }

  const deadlineDday = getDday(app.deadline);
  const interviewDday = getDday(app.interview_date);
  const parsed = app.parsed_data as {
    requirements?: string[];
    keywords?: string[];
  } | null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/applications">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{app.company_name}</h1>
          {app.job_title && (
            <p className="text-sm text-muted-foreground">{app.job_title}</p>
          )}
        </div>
        <Badge className={cn("shrink-0", STAGE_COLOR[app.stage])}>
          {STAGE_LABEL[app.stage]}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left column: Info */}
        <div className="space-y-4">
          <Card className="glass-card">
            <CardHeader className="py-3">
              <CardTitle className="text-base">지원 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Stage */}
              <div className="space-y-1">
                <Label>단계</Label>
                <Select value={app.stage} onValueChange={(v) => { if (v) handleStageChange(v); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interested">관심</SelectItem>
                    <SelectItem value="applied">지원완료</SelectItem>
                    <SelectItem value="interview">면접</SelectItem>
                    <SelectItem value="result">결과</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Result */}
              {app.result && (
                <div className="space-y-1">
                  <Label>결과</Label>
                  <p>
                    <Badge
                      variant={app.result === "pass" ? "default" : app.result === "fail" ? "destructive" : "secondary"}
                    >
                      {RESULT_LABEL[app.result]}
                    </Badge>
                  </p>
                </div>
              )}

              <Separator />

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">마감일</Label>
                  <p className="text-sm flex items-center gap-2">
                    {app.deadline
                      ? new Date(app.deadline).toLocaleDateString("ko-KR")
                      : "-"}
                    {deadlineDday && (
                      <span className={cn("text-xs", deadlineDday.className)}>
                        {deadlineDday.text}
                      </span>
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">면접일</Label>
                  <p className="text-sm flex items-center gap-2">
                    {app.interview_date
                      ? new Date(app.interview_date).toLocaleDateString("ko-KR")
                      : "-"}
                    {interviewDday && (
                      <span className={cn("text-xs", interviewDday.className)}>
                        {interviewDday.text}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Links */}
              {app.job_url && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">채용공고</Label>
                    <a
                      href={app.job_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      공고 바로가기
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </>
              )}

              {app.resume_id && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">연결된 자소서</Label>
                    <Link
                      href={`/resume/${app.resume_id}`}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <FileText className="h-3 w-3" />
                      자소서 보기
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Parsed Data */}
          {parsed && (parsed.requirements?.length || parsed.keywords?.length) ? (
            <Card className="glass-card">
              <CardHeader className="py-3">
                <CardTitle className="text-base">파싱 데이터</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {parsed.requirements && parsed.requirements.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">요구사항</Label>
                    <ul className="text-sm space-y-0.5 list-disc list-inside">
                      {parsed.requirements.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {parsed.keywords && parsed.keywords.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">키워드</Label>
                    <div className="flex flex-wrap gap-1">
                      {parsed.keywords.map((kw, i) => (
                        <Badge key={i} variant="secondary">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Right column: Notes + Actions */}
        <div className="space-y-4">
          <Card className="glass-card">
            <CardHeader className="py-3">
              <CardTitle className="text-base">메모</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="메모를 입력하세요..."
                rows={8}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveNotes}
                disabled={savingNotes || notes === (app.notes || "")}
              >
                {savingNotes && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                저장
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-card border-destructive/20">
            <CardContent className="py-4">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="w-full"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1" />
                )}
                지원 삭제
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
