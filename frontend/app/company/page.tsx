"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Building2, FileText, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { CompanyAnalysis } from "@/lib/types";

export default function CompanyListPage() {
  const [analyses, setAnalyses] = useState<CompanyAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    loadAnalyses();
  }, []);

  async function loadAnalyses() {
    try {
      const data = await api.get<CompanyAnalysis[]>("/api/company");
      setAnalyses(data);
    } catch {
      toast.error("기업 분석 목록을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("이 기업 분석을 삭제하시겠습니까?")) return;
    try {
      await api.delete(`/api/company/${id}`);
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
      toast.success("삭제되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제 실패");
    }
  }

  const filtered = query
    ? analyses.filter((a) =>
        a.company_name.toLowerCase().includes(query.toLowerCase())
      )
    : analyses;

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-muted animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">기업 분석</h1>
          <p className="text-sm text-muted-foreground mt-1">
            채용공고를 AI로 분석하여 요구사항과 키워드를 추출합니다
          </p>
        </div>
        <Link href="/company/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />새 분석
          </Button>
        </Link>
      </div>

      {/* Search */}
      {analyses.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="기업명으로 검색..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Empty State */}
      {analyses.length === 0 && (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Card className="text-center py-16 px-8 w-full max-w-md">
            <CardContent>
              <Building2 className="h-16 w-16 mx-auto text-muted-foreground/40 mb-6" />
              <p className="text-sm text-muted-foreground mb-6">
                채용공고를 분석하고 맞춤 자소서를 생성해 보세요
              </p>
              <Link href="/company/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />새 분석 시작
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Card List */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((a) => (
            <Link key={a.id} href={`/company/${a.id}`}>
              <Card className="hover:border-primary/30 transition-colors cursor-pointer mb-3">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {a.company_name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(a.analyzed_at).toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/resume/new?analysisId=${a.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          aria-label="자소서 생성"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDelete(e, a.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {a.keywords && a.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {a.keywords.slice(0, 5).map((kw, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {kw}
                        </Badge>
                      ))}
                      {a.keywords.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{a.keywords.length - 5}
                        </Badge>
                      )}
                    </div>
                  )}
                  {a.requirements && a.requirements.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      요구사항 {a.requirements.length}개
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {query && filtered.length === 0 && analyses.length > 0 && (
        <p className="text-center text-muted-foreground py-8">
          &ldquo;{query}&rdquo; 검색 결과가 없습니다
        </p>
      )}
    </div>
  );
}
