"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import type { CompanyAnalysis } from "@/lib/types";

export default function CompanyComparePage() {
  const [analyses, setAnalyses] = useState<CompanyAnalysis[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<CompanyAnalysis[]>("/api/company")
      .then(setAnalyses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  }

  const items = selected.map((id) => analyses.find((a) => a.id === id)).filter(Boolean) as CompanyAnalysis[];

  if (loading) return <div className="text-center py-12 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <Link href="/company">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />목록으로
        </Button>
      </Link>

      <h1 className="text-2xl font-bold mb-2">기업 비교</h1>
      <p className="text-sm text-muted-foreground mb-6">최대 3개 기업을 선택하여 비교합니다.</p>

      {/* Selection */}
      <div className="flex flex-wrap gap-2 mb-6">
        {analyses.map((a) => (
          <button
            key={a.id}
            onClick={() => toggle(a.id)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              selected.includes(a.id)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-muted"
            }`}
          >
            {a.company_name}
          </button>
        ))}
      </div>

      {items.length < 2 && (
        <p className="text-center text-muted-foreground py-8">2개 이상의 기업을 선택하세요.</p>
      )}

      {/* Comparison Grid */}
      {items.length >= 2 && (
        <div className="space-y-6">
          {/* Header Row */}
          <div className={`grid gap-4 ${items.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            {items.map((a) => (
              <Card key={a.id}>
                <CardContent className="pt-4 text-center">
                  <Building2 className="h-8 w-8 mx-auto text-indigo-500 mb-2" />
                  <h3 className="font-bold">{a.company_name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(a.analyzed_at).toLocaleDateString("ko-KR")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Overview */}
          <CompareSection title="기업 개요" items={items} render={(a) => {
            const tp = a.talent_profile as Record<string, unknown> | null;
            const overview = tp?.company_overview as Record<string, string> | undefined;
            if (!overview) return <p className="text-xs text-muted-foreground">데이터 없음</p>;
            const labels: Record<string, string> = { industry: "산업", company_culture: "문화", growth_stage: "단계", recent_focus: "동향" };
            return (
              <div className="space-y-1.5">
                {Object.entries(overview).map(([k, v]) => (
                  <div key={k}>
                    <span className="text-[10px] text-muted-foreground">{labels[k] || k}</span>
                    <p className="text-sm">{v}</p>
                  </div>
                ))}
              </div>
            );
          }} />

          {/* Requirements Count */}
          <CompareSection title="요구사항" items={items} render={(a) => {
            const reqs = (a.requirements || []) as string[];
            const tags = ["필수", "우대", "기술", "소프트", "경험", "숨겨진"];
            return (
              <div className="space-y-1">
                <p className="text-lg font-bold">{reqs.length}개</p>
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => {
                    const count = reqs.filter((r) => typeof r === "string" && r.startsWith(`[${tag}]`)).length;
                    if (!count) return null;
                    return <Badge key={tag} variant="outline" className="text-[10px]">{tag} {count}</Badge>;
                  })}
                </div>
              </div>
            );
          }} />

          {/* Keywords */}
          <CompareSection title="핵심 키워드" items={items} render={(a) => (
            <div className="flex flex-wrap gap-1">
              {(a.keywords || []).map((kw, i) => <Badge key={i} variant="secondary" className="text-[10px]">{kw}</Badge>)}
              {(!a.keywords || a.keywords.length === 0) && <p className="text-xs text-muted-foreground">없음</p>}
            </div>
          )} />

          {/* Talent Profile */}
          <CompareSection title="인재상" items={items} render={(a) => {
            const tp = a.talent_profile as Record<string, unknown> | null;
            if (!tp) return <p className="text-xs text-muted-foreground">데이터 없음</p>;
            return (
              <div className="space-y-2">
                {Array.isArray(tp.core_values) && tp.core_values.length > 0 && (
                  <div>
                    <span className="text-[10px] text-muted-foreground">핵심가치</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {(tp.core_values as string[]).map((v, i) => <Badge key={i} variant="outline" className="text-[10px]">{v}</Badge>)}
                    </div>
                  </div>
                )}
                {typeof tp.ideal_candidate === "string" && (
                  <div>
                    <span className="text-[10px] text-muted-foreground">이상적인 지원자</span>
                    <p className="text-xs mt-0.5 line-clamp-3">{String(tp.ideal_candidate)}</p>
                  </div>
                )}
              </div>
            );
          }} />
        </div>
      )}
    </div>
  );
}

function CompareSection({ title, items, render }: {
  title: string;
  items: CompanyAnalysis[];
  render: (a: CompanyAnalysis) => React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`grid gap-4 ${items.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {items.map((a) => (
            <div key={a.id} className="min-h-[60px]">
              {render(a)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
