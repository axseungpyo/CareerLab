"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  User, FileText, Mic, Search, ArrowRight, Sparkles,
  TrendingUp, BarChart3, Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Profile, Resume } from "@/lib/types";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

// ── Types ──

interface DashboardSummary {
  total_resumes: number;
  total_submitted: number;
  total_passed: number;
  pass_rate: number;
  total_mock_sessions: number;
  avg_mock_score: number;
  recent_feedback_avg: {
    structure: number;
    content: number;
    expression: number;
    strategy: number;
  };
}

interface DashboardTrends {
  mock_scores: { date: string; score: number; grade: string }[];
  feedback_scores: { date: string; structure: number; content: number; expression: number; strategy: number }[];
  resumes_by_month: { month: string; count: number }[];
}

// ── Constants ──

const QUICK_ACTIONS = [
  { href: "/profile", label: "프로필", desc: "이력/경력 관리", icon: User, gradient: "from-blue-500 to-indigo-500" },
  { href: "/resume/new", label: "자소서", desc: "기업별 맞춤 생성", icon: FileText, gradient: "from-indigo-500 to-violet-500" },
  { href: "/interview", label: "면접", desc: "모의면접 + 평가", icon: Mic, gradient: "from-violet-500 to-purple-500" },
  { href: "/review", label: "첨삭", desc: "4축 분석", icon: Search, gradient: "from-purple-500 to-pink-500" },
];

const FEEDBACK_LABELS: Record<string, string> = {
  structure: "구조",
  content: "내용",
  expression: "표현",
  strategy: "전략",
};

// ── Page ──

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trends, setTrends] = useState<DashboardTrends | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get<Profile | null>("/api/profile").then(setProfile),
      api.get<Resume[]>("/api/resume").then(setResumes),
      api.get<DashboardSummary>("/api/stats/summary").then(setSummary).catch(() => null),
      api.get<DashboardTrends>("/api/stats/trends").then(setTrends).catch(() => null),
    ]).finally(() => setLoading(false));
  }, []);

  const profileFields = profile
    ? [profile.name, profile.email, profile.education?.length, profile.summary, profile.career_goal]
    : [];
  const completedFields = profileFields.filter(Boolean).length;
  const profileProgress = profile ? completedFields * 20 : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* ── Hero Section ── */}
      <section className="gradient-hero rounded-2xl p-8 md:p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-4 right-8 w-32 h-32 bg-indigo-300 dark:bg-indigo-700 rounded-full blur-3xl" />
          <div className="absolute bottom-4 left-12 w-24 h-24 bg-violet-300 dark:bg-violet-700 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
              AI Career Consulting
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight leading-snug">
            AI가 당신의 커리어를
            <br />
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
              함께 설계합니다
            </span>
          </h1>
          <p className="text-muted-foreground mb-6 max-w-lg leading-relaxed">
            이력/경력 데이터를 기반으로 맞춤 자소서를 생성하고,
            AI 면접관과 모의면접을 진행하세요.
          </p>
          <div className="flex gap-3">
            <Link href="/resume/new">
              <Button className="btn-gradient border-0 px-6">
                자소서 시작하기
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="outline" className="backdrop-blur-sm">프로필 작성</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Quick Actions ── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {QUICK_ACTIONS.map(({ href, label, desc, icon: Icon, gradient }) => (
          <Link key={href} href={href}>
            <div className="glass-card rounded-xl p-5 hover-card cursor-pointer group h-full">
              <div className={cn(
                "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center mb-3",
                gradient
              )}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold text-sm mb-0.5">{label}</h3>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </Link>
        ))}
      </section>

      {/* ── Summary Stats ── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          label="자소서"
          value={summary?.total_resumes ?? resumes.length}
          sub={`${summary?.total_submitted ?? 0}건 제출`}
          color="text-indigo-600 dark:text-indigo-400"
        />
        <StatCard
          icon={Target}
          label="합격률"
          value={summary?.pass_rate ? `${summary.pass_rate}%` : "-"}
          sub={`${summary?.total_passed ?? 0}건 합격`}
          color="text-green-600 dark:text-green-400"
        />
        <StatCard
          icon={Mic}
          label="모의면접"
          value={summary?.total_mock_sessions ?? 0}
          sub={summary?.avg_mock_score ? `평균 ${summary.avg_mock_score}점` : "아직 없음"}
          color="text-violet-600 dark:text-violet-400"
        />
        <StatCard
          icon={TrendingUp}
          label="첨삭 평균"
          value={summary?.recent_feedback_avg
            ? Math.round(
                (summary.recent_feedback_avg.structure +
                  summary.recent_feedback_avg.content +
                  summary.recent_feedback_avg.expression +
                  summary.recent_feedback_avg.strategy) / 4
              )
            : "-"}
          sub="4축 평균 (10점 만점)"
          color="text-pink-600 dark:text-pink-400"
        />
      </section>

      {/* ── Charts ── */}
      {(trends?.mock_scores?.length || trends?.feedback_scores?.length) ? (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mock Interview Score Trend */}
          {trends?.mock_scores && trends.mock_scores.length > 0 && (
            <Card className="glass-card border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Mic className="h-3.5 w-3.5" />
                  면접 점수 추이
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={trends.mock_scores}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: string) => v.slice(5)}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={30} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(value: number) => [`${value}점`, "점수"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="oklch(0.55 0.22 280)"
                      strokeWidth={2}
                      dot={{ fill: "oklch(0.55 0.22 280)", r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Feedback Score Trend */}
          {trends?.feedback_scores && trends.feedback_scores.length > 0 && (
            <Card className="glass-card border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />
                  첨삭 점수 추이
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={trends.feedback_scores}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: string) => v.slice(5)}
                    />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} width={24} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(value: number, name: string) => [
                        `${value}점`,
                        FEEDBACK_LABELS[name] || name,
                      ]}
                    />
                    <Bar dataKey="structure" fill="oklch(0.60 0.18 260)" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="content" fill="oklch(0.58 0.20 280)" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="expression" fill="oklch(0.55 0.22 300)" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="strategy" fill="oklch(0.52 0.20 320)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </section>
      ) : null}

      {/* ── Profile Progress + Recent Activity ── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Profile Progress */}
        <Card className="glass-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              프로필 완성도
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    className="text-muted/50"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="url(#progress-gradient)"
                    strokeWidth="3"
                    strokeDasharray={`${profileProgress}, 100`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="progress-gradient">
                      <stop offset="0%" stopColor="oklch(0.55 0.22 270)" />
                      <stop offset="100%" stopColor="oklch(0.52 0.22 290)" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                  {profileProgress}%
                </span>
              </div>
              <div>
                <p className="text-sm font-medium">
                  {completedFields}/5 항목 완료
                </p>
                {!profile && (
                  <Link href="/profile">
                    <Button variant="link" className="p-0 h-auto text-xs text-primary">
                      프로필 작성하기 →
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feedback Axis Summary */}
        {summary?.recent_feedback_avg && Object.values(summary.recent_feedback_avg).some(v => v > 0) ? (
          <Card className="glass-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                첨삭 4축 평균
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(summary.recent_feedback_avg).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{FEEDBACK_LABELS[key]}</span>
                        <span className="font-medium">{value}/10</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
                          style={{ width: `${value * 10}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                지원 현황
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-8">
                {[
                  { n: resumes.length, label: "전체", color: "text-foreground" },
                  { n: resumes.filter((r) => r.status === "submitted").length, label: "제출", color: "text-indigo-600 dark:text-indigo-400" },
                  { n: resumes.filter((r) => r.result === "pass").length, label: "합격", color: "text-green-600 dark:text-green-400" },
                ].map(({ n, label, color }) => (
                  <div key={label} className="text-center">
                    <div className={cn("text-2xl font-bold", color)}>{n}</div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── Recent Resumes ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">최근 자소서</h2>
          {resumes.length > 0 && (
            <Link href="/resume">
              <Button variant="ghost" size="sm" className="text-xs">
                전체 보기 →
              </Button>
            </Link>
          )}
        </div>
        {resumes.length > 0 ? (
          <div className="space-y-2">
            {resumes.slice(0, 5).map((resume) => (
              <Link key={resume.id} href={`/resume/${resume.id}`}>
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{resume.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(resume.created_at).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {resume.status === "draft" ? "작성중" : resume.status === "final" ? "완성" : "제출"}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title="아직 자소서가 없어요"
            description="채용공고를 붙여넣으면 AI가 맞춤 자소서를 생성합니다"
            action={{ label: "첫 자소서 만들기", href: "/resume/new" }}
          />
        )}
      </section>
    </div>
  );
}

// ── Stat Card Component ──

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub: string;
  color: string;
}) {
  return (
    <Card className="glass-card border-0">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-muted/80 flex items-center justify-center shrink-0">
            <Icon className={cn("h-4 w-4", color)} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn("text-xl font-bold", color)}>{value}</p>
            <p className="text-[11px] text-muted-foreground">{sub}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
