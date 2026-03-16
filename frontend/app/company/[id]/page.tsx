"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  ExternalLink,
  FileText,
  Globe,
  Sparkles,
  Tag,
  Target,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import type { CompanyAnalysis } from "@/lib/types";

interface SearchResult {
  title: string;
  description: string;
  url: string;
}

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [analysis, setAnalysis] = useState<CompanyAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadAnalysis(params.id as string);
    }
  }, [params.id]);

  async function loadAnalysis(id: string) {
    try {
      const data = await api.get<CompanyAnalysis>(`/api/company/${id}`);
      setAnalysis(data);
    } catch {
      toast.error("기업 분석을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!analysis) return;
    if (!confirm(`"${analysis.company_name}" 분석을 삭제하시겠습니까?`)) return;
    try {
      await api.delete(`/api/company/${analysis.id}`);
      toast.success("삭제되었습니다.");
      router.push("/company");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제 실패");
    }
  }

  if (loading) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">분석을 찾을 수 없습니다.</p>
        <Link href="/company">
          <Button className="mt-4">목록으로</Button>
        </Link>
      </div>
    );
  }

  const searchResults: SearchResult[] =
    (analysis.company_info as { search_results?: SearchResult[] })
      ?.search_results ?? [];

  const talentProfile = analysis.talent_profile as Record<string, unknown> | null;

  // Categorize search results for structured display
  const searchCategories: { label: string; items: SearchResult[] }[] = (() => {
    const cats: Record<string, { label: string; items: SearchResult[] }> = {
      culture: { label: "기업문화 & 가치", items: [] },
      news: { label: "최근 뉴스 & 동향", items: [] },
      hiring: { label: "채용 & 면접 정보", items: [] },
    };
    const uncategorized: SearchResult[] = [];
    for (const sr of searchResults) {
      const cat = (sr as SearchResult & { category?: string }).category;
      if (cat && cats[cat]) {
        cats[cat].items.push(sr);
      } else {
        uncategorized.push(sr);
      }
    }
    return [
      ...Object.values(cats).filter((c) => c.items.length > 0),
      ...(uncategorized.length > 0 ? [{ label: "기타", items: uncategorized }] : []),
    ];
  })();

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">
      {/* Back */}
      <Link href="/company">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          목록으로
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-indigo-500" />
            {analysis.company_name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date(analysis.analyzed_at).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          {analysis.job_posting_url && (
            <a
              href={analysis.job_posting_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline mt-1"
            >
              <ExternalLink className="h-3 w-3" />
              채용공고 원문
            </a>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link href={`/resume/new?analysisId=${analysis.id}`}>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            자소서 생성
          </Button>
        </Link>
        <Link
          href={`/applications/new?companyName=${encodeURIComponent(analysis.company_name)}&analysisId=${analysis.id}`}
        >
          <Button variant="outline">
            <Briefcase className="h-4 w-4 mr-2" />
            지원 등록
          </Button>
        </Link>
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          삭제
        </Button>
      </div>

      <div className="space-y-4">
        {/* Requirements */}
        {Array.isArray(analysis.requirements) && analysis.requirements.length > 0 ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-orange-500" />
                채용 요구사항
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {(analysis.requirements as string[]).map((req, i) => {
                  const text = typeof req === "string" ? req : JSON.stringify(req);
                  const tagMatch = text.match(/^\[(.+?)\]\s*/);
                  const tag = tagMatch ? tagMatch[1] : null;
                  const content = tag && tagMatch ? text.replace(tagMatch[0], "") : text;
                  const tagColors: Record<string, string> = {
                    "필수": "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
                    "우대": "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
                    "기술": "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
                    "소프트": "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
                    "경험": "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
                    "숨겨진": "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-400",
                  };
                  return (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      {tag ? (
                        <span className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${tagColors[tag] || "bg-muted text-muted-foreground"}`}>
                          {tag}
                        </span>
                      ) : (
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0" />
                      )}
                      {content}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {/* Company Overview (from talent_profile.company_overview) */}
        {talentProfile?.company_overview && typeof talentProfile.company_overview === "object" ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-500" />
                기업 개요
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(talentProfile.company_overview as Record<string, unknown>).map(([key, value]) => {
                  const labels: Record<string, string> = {
                    industry: "산업 분야",
                    company_culture: "조직문화",
                    growth_stage: "기업 단계",
                    recent_focus: "최근 주력 방향",
                  };
                  return (
                    <div key={key} className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-0.5">{labels[key] || key}</p>
                      <p className="text-sm font-medium">{String(value)}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Talent Profile */}
        {talentProfile && Object.keys(talentProfile).length > 0 ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                인재상
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {Object.entries(talentProfile)
                .filter(([key]) => key !== "company_overview")
                .map(([key, value], i) => {
                  const labels: Record<string, string> = {
                    core_values: "핵심 가치",
                    ideal_candidate: "이상적인 지원자",
                    team_characteristics: "팀/조직 특성",
                    growth_opportunities: "성장 기회",
                  };
                  return (
                    <div key={i}>
                      {i > 0 && <Separator className="mb-3" />}
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        {labels[key] || key}
                      </p>
                      {Array.isArray(value) ? (
                        <div className="flex flex-wrap gap-1.5">
                          {value.map((v, j) => (
                            <Badge key={j} variant="outline" className="text-xs">
                              {String(v)}
                            </Badge>
                          ))}
                        </div>
                      ) : typeof value === "object" && value !== null ? (
                        <p className="text-sm">{JSON.stringify(value)}</p>
                      ) : (
                        <p className="text-sm">{String(value)}</p>
                      )}
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        ) : null}

        {/* Keywords */}
        {analysis.keywords && analysis.keywords.length > 0 ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4 text-violet-500" />
                핵심 키워드
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {analysis.keywords.map((kw, i) => (
                  <Badge key={i} variant="secondary">
                    {kw}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Company Info (Search Results by Category) */}
        {searchCategories.length > 0 ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-green-500" />
                웹 리서치 결과
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {searchCategories.map((section, si) => (
                <div key={si}>
                  {si > 0 && <Separator className="mb-4" />}
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    {section.label}
                  </p>
                  <div className="space-y-2">
                    {section.items.map((sr, i) => (
                      <div key={i}>
                        {sr.url ? (
                          <a
                            href={sr.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {sr.title}
                          </a>
                        ) : (
                          <p className="text-sm font-medium">{sr.title}</p>
                        )}
                        {sr.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-3">
                            {sr.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {/* Research Notes */}
        {analysis.research_notes ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                분석 노트
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="bg-muted rounded-md p-4 text-sm whitespace-pre-wrap">
                {analysis.research_notes}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
