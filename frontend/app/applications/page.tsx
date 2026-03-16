"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, Calendar, Plus, ChevronRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/empty-state";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Application } from "@/lib/types";

const STAGES = ["interested", "applied", "interview", "result"] as const;

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

function getNextStage(current: string): string | null {
  const idx = STAGES.indexOf(current as typeof STAGES[number]);
  if (idx < 0 || idx >= STAGES.length - 1) return null;
  return STAGES[idx + 1];
}

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Application[]>("/api/applications")
      .then(setApplications)
      .catch(() => toast.error("지원 목록을 불러오지 못했습니다"))
      .finally(() => setLoading(false));
  }, []);

  const grouped = STAGES.reduce(
    (acc, stage) => {
      acc[stage] = applications.filter((a) => a.stage === stage);
      return acc;
    },
    {} as Record<string, Application[]>
  );

  async function handleAdvanceStage(app: Application) {
    const next = getNextStage(app.stage);
    if (!next) return;

    if (next === "result") {
      const result = window.prompt("결과를 입력하세요 (pass / fail / pending):", "pending");
      if (!result || !["pass", "fail", "pending"].includes(result)) {
        toast.error("pass, fail, pending 중 하나를 입력해주세요");
        return;
      }
      setAdvancing(app.id);
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${API_URL}/api/applications/${app.id}/stage`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: next, result }),
        });
        if (!res.ok) throw new Error("단계 변경 실패");
        const updated = await res.json();
        setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        toast.success(`${app.company_name} → ${STAGE_LABEL[next]}`);
      } catch {
        toast.error("단계 변경에 실패했습니다");
      } finally {
        setAdvancing(null);
      }
      return;
    }

    setAdvancing(app.id);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_URL}/api/applications/${app.id}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: next }),
      });
      if (!res.ok) throw new Error("단계 변경 실패");
      const updated = await res.json();
      setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      toast.success(`${app.company_name} → ${STAGE_LABEL[next]}`);
    } catch {
      toast.error("단계 변경에 실패했습니다");
    } finally {
      setAdvancing(null);
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">지원 관리</h1>
        <div className="flex gap-2">
          <Link href="/applications/calendar">
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-1" />
              캘린더
            </Button>
          </Link>
          <Link href="/applications/new">
            <Button className="btn-gradient border-0" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              새 지원
            </Button>
          </Link>
        </div>
      </div>

      {applications.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="아직 등록한 지원 현황이 없어요"
          description="채용공고 URL을 입력하면 자동으로 정보를 파싱하고 지원을 추적합니다"
          action={{ label: "첫 지원 등록하기", href: "/applications/new" }}
        />
      ) : (
        <>
          {/* Desktop: Kanban 4 columns */}
          <div className="hidden md:grid md:grid-cols-4 gap-4">
            {STAGES.map((stage) => (
              <div key={stage} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs", STAGE_COLOR[stage])}>
                      {STAGE_LABEL[stage]}
                    </span>
                    <span className="text-muted-foreground text-xs">{grouped[stage].length}</span>
                  </h2>
                </div>
                <div className="space-y-2">
                  {grouped[stage].map((app) => (
                    <ApplicationCard
                      key={app.id}
                      app={app}
                      onAdvance={() => handleAdvanceStage(app)}
                      advancing={advancing === app.id}
                      onClick={() => router.push(`/applications/${app.id}`)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile: single column with stage headers */}
          <div className="md:hidden space-y-4">
            {STAGES.map((stage) =>
              grouped[stage].length > 0 ? (
                <div key={stage} className="space-y-2">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs", STAGE_COLOR[stage])}>
                      {STAGE_LABEL[stage]}
                    </span>
                    <span className="text-muted-foreground text-xs">{grouped[stage].length}</span>
                  </h2>
                  {grouped[stage].map((app) => (
                    <ApplicationCard
                      key={app.id}
                      app={app}
                      onAdvance={() => handleAdvanceStage(app)}
                      advancing={advancing === app.id}
                      onClick={() => router.push(`/applications/${app.id}`)}
                    />
                  ))}
                </div>
              ) : null
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ApplicationCard({
  app,
  onAdvance,
  advancing,
  onClick,
}: {
  app: Application;
  onAdvance: () => void;
  advancing: boolean;
  onClick: () => void;
}) {
  const dday = getDday(app.deadline);
  const nextStage = getNextStage(app.stage);

  return (
    <Card
      className="glass-card hover-card cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{app.company_name}</p>
            {app.job_title && (
              <p className="text-xs text-muted-foreground truncate">{app.job_title}</p>
            )}
          </div>
          {dday && (
            <span className={cn("text-xs whitespace-nowrap", dday.className)}>
              {dday.text}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            {app.result && (
              <Badge
                variant={app.result === "pass" ? "default" : app.result === "fail" ? "destructive" : "secondary"}
              >
                {RESULT_LABEL[app.result]}
              </Badge>
            )}
            {app.resume_id && (
              <Link
                href={`/resume/${app.resume_id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Badge variant="outline" className="gap-1">
                  <FileText className="h-3 w-3" />
                  자소서
                </Badge>
              </Link>
            )}
          </div>
          {nextStage && (
            <Button
              variant="ghost"
              size="xs"
              disabled={advancing}
              onClick={(e) => {
                e.stopPropagation();
                onAdvance();
              }}
              className="text-xs text-muted-foreground hover:text-primary"
            >
              {advancing ? "..." : `${STAGE_LABEL[nextStage]}`}
              <ChevronRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
