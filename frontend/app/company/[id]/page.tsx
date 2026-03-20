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
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Tag,
  Target,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import type { CompanyAnalysis } from "@/lib/types";

interface SearchResult {
  title: string;
  description: string;
  url: string;
  category?: string;
}

const TAG_COLORS: Record<string, string> = {
  "필수": "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  "우대": "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  "기술": "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
  "소프트": "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  "경험": "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  "숨겨진": "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-400",
};

const REQ_FILTERS = ["전체", "필수", "우대", "기술", "소프트", "경험", "숨겨진"] as const;

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [analysis, setAnalysis] = useState<CompanyAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [reqFilter, setReqFilter] = useState("전체");
  const [reanalyzing, setReanalyzing] = useState(false);

  // Keyword editing
  const [newKeyword, setNewKeyword] = useState("");

  // Requirement adding
  const [showAddReq, setShowAddReq] = useState(false);
  const [newReqTag, setNewReqTag] = useState("필수");
  const [newReqText, setNewReqText] = useState("");

  useEffect(() => {
    if (params.id) loadAnalysis(params.id as string);
  }, [params.id]);

  async function loadAnalysis(id: string) {
    try {
      setAnalysis(await api.get<CompanyAnalysis>(`/api/company/${id}`));
    } catch {
      toast.error("기업 분석을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!analysis || !confirm(`"${analysis.company_name}" 분석을 삭제하시겠습니까?`)) return;
    try {
      await api.delete(`/api/company/${analysis.id}`);
      toast.success("삭제되었습니다.");
      router.push("/company");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제 실패");
    }
  }

  async function updateField(field: string, value: unknown) {
    if (!analysis) return;
    try {
      const updated = await api.put<CompanyAnalysis>(`/api/company/${analysis.id}`, { [field]: value });
      setAnalysis(updated);
    } catch {
      toast.error("업데이트에 실패했습니다.");
    }
  }

  function removeKeyword(kw: string) {
    if (!analysis?.keywords) return;
    updateField("keywords", analysis.keywords.filter((k) => k !== kw));
  }

  function addKeyword() {
    if (!newKeyword.trim() || !analysis) return;
    const updated = [...(analysis.keywords || []), newKeyword.trim()];
    updateField("keywords", updated);
    setNewKeyword("");
  }

  function removeRequirement(idx: number) {
    if (!analysis?.requirements) return;
    updateField("requirements", (analysis.requirements as string[]).filter((_, i) => i !== idx));
  }

  function addRequirement() {
    if (!newReqText.trim() || !analysis) return;
    const item = `[${newReqTag}] ${newReqText.trim()}`;
    updateField("requirements", [...(analysis.requirements as string[] || []), item]);
    setNewReqText("");
    setShowAddReq(false);
  }

  async function handleReanalyze() {
    if (!analysis || !confirm("기존 분석 결과가 업데이트됩니다. 계속하시겠습니까?")) return;
    setReanalyzing(true);
    try {
      const result = await api.post<CompanyAnalysis>("/api/company/analyze", {
        company_name: analysis.company_name,
        job_posting_text: analysis.job_posting_text || "",
        job_posting_url: analysis.job_posting_url || undefined,
        web_search: true,
      });
      // Delete old, redirect to new
      await api.delete(`/api/company/${analysis.id}`).catch(() => {});
      toast.success("재분석이 완료되었습니다.");
      router.push(`/company/${result.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "재분석에 실패했습니다.");
    } finally {
      setReanalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">분석을 찾을 수 없습니다.</p>
        <Link href="/company"><Button className="mt-4">목록으로</Button></Link>
      </div>
    );
  }

  const searchResults: SearchResult[] =
    (analysis.company_info as { search_results?: SearchResult[] })?.search_results ?? [];
  const talentProfile = analysis.talent_profile as Record<string, unknown> | null;
  const requirements = (analysis.requirements || []) as string[];
  const keywords = analysis.keywords || [];

  // Filter requirements by tag
  const filteredReqs = reqFilter === "전체"
    ? requirements
    : requirements.filter((r) => typeof r === "string" && r.startsWith(`[${reqFilter}]`));

  // Categorize search results
  const searchCategories = (() => {
    const cats: Record<string, { label: string; icon: string; items: SearchResult[] }> = {
      culture: { label: "기업문화", icon: "🏢", items: [] },
      news: { label: "최근 뉴스", icon: "📰", items: [] },
      hiring: { label: "채용 정보", icon: "💼", items: [] },
    };
    for (const sr of searchResults) {
      const cat = sr.category;
      if (cat && cats[cat]) cats[cat].items.push(sr);
      else cats.culture.items.push(sr);
    }
    return Object.values(cats).filter((c) => c.items.length > 0);
  })();

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">
      {/* Back */}
      <Link href="/company">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />목록으로
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-indigo-500" />
            {analysis.company_name}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span>{new Date(analysis.analyzed_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}</span>
            {analysis.job_posting_url && (
              <a href={analysis.job_posting_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline">
                <ExternalLink className="h-3 w-3" />채용공고
              </a>
            )}
          </div>
        </div>
        <div className="flex gap-1.5">
          <Link href={`/resume/new?analysisId=${analysis.id}`}>
            <Button size="sm"><FileText className="h-3.5 w-3.5 mr-1" />자소서</Button>
          </Link>
          <Link href={`/applications/new?companyName=${encodeURIComponent(analysis.company_name)}&analysisId=${analysis.id}`}>
            <Button size="sm" variant="outline"><Briefcase className="h-3.5 w-3.5 mr-1" />지원</Button>
          </Link>
          <Button size="sm" variant="outline" onClick={handleReanalyze} disabled={reanalyzing}>
            {reanalyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* 4-Tab Layout */}
      <Tabs defaultValue="summary">
        <TabsList className="mb-4">
          <TabsTrigger value="summary">요약</TabsTrigger>
          <TabsTrigger value="requirements">요구사항 {requirements.length > 0 && `(${requirements.length})`}</TabsTrigger>
          <TabsTrigger value="strategy">전략</TabsTrigger>
          <TabsTrigger value="research">리서치 {searchResults.length > 0 && `(${searchResults.length})`}</TabsTrigger>
        </TabsList>

        {/* ── 요약 탭 ── */}
        <TabsContent value="summary">
          <div className="space-y-4">
            {/* Company Overview */}
            {talentProfile?.company_overview && typeof talentProfile.company_overview === "object" && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-indigo-500" />기업 개요
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(talentProfile.company_overview as Record<string, unknown>).map(([key, value]) => {
                      const labels: Record<string, string> = { industry: "산업", company_culture: "문화", growth_stage: "단계", recent_focus: "동향" };
                      return (
                        <div key={key} className="bg-muted/50 rounded-lg p-3 text-center">
                          <p className="text-[10px] text-muted-foreground mb-0.5">{labels[key] || key}</p>
                          <p className="text-sm font-medium">{String(value)}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Talent Profile */}
            {talentProfile && Object.keys(talentProfile).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />인재상
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {Object.entries(talentProfile)
                    .filter(([key]) => key !== "company_overview")
                    .map(([key, value], i) => {
                      const labels: Record<string, string> = { core_values: "핵심 가치", ideal_candidate: "이상적인 지원자", team_characteristics: "팀 특성", growth_opportunities: "성장 기회" };
                      return (
                        <div key={i}>
                          {i > 0 && <Separator className="mb-3" />}
                          <p className="text-sm font-medium text-muted-foreground mb-1">{labels[key] || key}</p>
                          {Array.isArray(value) ? (
                            <div className="flex flex-wrap gap-1.5">
                              {value.map((v, j) => <Badge key={j} variant="outline" className="text-xs">{String(v)}</Badge>)}
                            </div>
                          ) : (
                            <p className="text-sm">{String(value)}</p>
                          )}
                        </div>
                      );
                    })}
                </CardContent>
              </Card>
            )}

            {/* Keywords */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4 text-violet-500" />핵심 키워드
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((kw, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                      {kw}
                      <button onClick={() => removeKeyword(kw)} className="ml-0.5 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                    placeholder="키워드 추가..."
                    className="flex-1 h-7 px-2 text-xs rounded-md border bg-background"
                  />
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addKeyword} disabled={!newKeyword.trim()}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── 요구사항 탭 ── */}
        <TabsContent value="requirements">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-orange-500" />채용 요구사항
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {/* Tag Filters */}
              <div className="flex flex-wrap gap-1.5">
                {REQ_FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setReqFilter(f)}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                      reqFilter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Requirements List */}
              {filteredReqs.length > 0 ? (
                <ul className="space-y-2">
                  {filteredReqs.map((req, i) => {
                    const text = typeof req === "string" ? req : JSON.stringify(req);
                    const tagMatch = text.match(/^\[(.+?)\]\s*/);
                    const tag = tagMatch ? tagMatch[1] : null;
                    const content = tag && tagMatch ? text.replace(tagMatch[0], "") : text;
                    const realIdx = requirements.indexOf(req);
                    return (
                      <li key={i} className="flex items-start gap-2 text-sm group">
                        {tag ? (
                          <span className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${TAG_COLORS[tag] || "bg-muted text-muted-foreground"}`}>
                            {tag}
                          </span>
                        ) : (
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0" />
                        )}
                        <span className="flex-1">{content}</span>
                        <button onClick={() => removeRequirement(realIdx)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0 mt-0.5">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {requirements.length === 0 ? "요구사항이 없습니다." : `"${reqFilter}" 항목이 없습니다.`}
                </p>
              )}

              {/* Add requirement */}
              {showAddReq ? (
                <div className="flex gap-1.5 items-end">
                  <select value={newReqTag} onChange={(e) => setNewReqTag(e.target.value)} className="h-7 px-1.5 text-xs rounded-md border bg-background">
                    {REQ_FILTERS.filter((f) => f !== "전체").map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <input value={newReqText} onChange={(e) => setNewReqText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRequirement())}
                    placeholder="요구사항 내용..."
                    className="flex-1 h-7 px-2 text-xs rounded-md border bg-background" autoFocus />
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addRequirement} disabled={!newReqText.trim()}>추가</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAddReq(false)}>취소</Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setShowAddReq(true)}>
                  <Plus className="h-3 w-3 mr-1" />요구사항 추가
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 전략 탭 ── */}
        <TabsContent value="strategy">
          <div className="space-y-4">
            {analysis.research_notes ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />자소서 전략 & 면접 준비
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">
                    {analysis.research_notes}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">전략 노트가 생성되지 않았습니다.</p>
                  <p className="text-xs text-muted-foreground mt-1">재분석을 실행하면 자소서 전략과 면접 준비 가이드가 생성됩니다.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── 리서치 탭 ── */}
        <TabsContent value="research">
          {searchCategories.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4 text-green-500" />웹 리서치 결과
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {searchCategories.map((section, si) => (
                  <div key={si}>
                    {si > 0 && <Separator className="mb-4" />}
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      {section.icon} {section.label} ({section.items.length}건)
                    </p>
                    <div className="space-y-2">
                      {section.items.map((sr, i) => (
                        <div key={i}>
                          {sr.url ? (
                            <a href={sr.url} target="_blank" rel="noopener noreferrer"
                              className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                              {sr.title}
                            </a>
                          ) : (
                            <p className="text-sm font-medium">{sr.title}</p>
                          )}
                          {sr.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-3">{sr.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Globe className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">웹 리서치가 실행되지 않았습니다.</p>
                <p className="text-xs text-muted-foreground mt-1">설정에서 웹 검색을 활성화하면 기업 뉴스, 문화, 채용 정보를 수집합니다.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
