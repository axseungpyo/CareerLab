"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { CompanyAnalysis } from "@/lib/types";

export default function NewAnalysisPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [jobPostingUrl, setJobPostingUrl] = useState("");
  const [jobPostingText, setJobPostingText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [parsing, setParsing] = useState(false);

  async function handleParseUrl() {
    if (!jobPostingUrl.trim()) { toast.error("URL을 먼저 입력하세요."); return; }
    setParsing(true);
    try {
      const result = await api.post<{ text: string }>("/api/company/parse-url", { url: jobPostingUrl.trim() });
      setJobPostingText(result.text);
      toast.success("채용공고 텍스트를 추출했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "URL 파싱에 실패했습니다.");
    } finally {
      setParsing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) {
      toast.error("기업명을 입력하세요.");
      return;
    }
    if (!jobPostingText.trim()) {
      toast.error("채용공고 본문을 입력하세요.");
      return;
    }

    setAnalyzing(true);
    try {
      const result = await api.post<CompanyAnalysis>("/api/company/analyze", {
        company_name: companyName.trim(),
        job_posting_text: jobPostingText.trim(),
        job_posting_url: jobPostingUrl.trim() || undefined,
        web_search: webSearch,
      });
      toast.success("기업 분석이 완료되었습니다!");
      router.push(`/company/${result.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "분석에 실패했습니다.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      {/* Back */}
      <Link href="/company">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          목록으로
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />새 기업 분석
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            채용공고를 입력하면 AI가 요구사항, 인재상, 키워드를 분석합니다
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="company_name">
                기업명 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="company_name"
                placeholder="예: 삼성전자, 네이버, 카카오"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={analyzing}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="job_url">채용공고 URL (선택)</Label>
              <div className="flex gap-2">
                <Input
                  id="job_url"
                  type="url"
                  placeholder="https://..."
                  value={jobPostingUrl}
                  onChange={(e) => setJobPostingUrl(e.target.value)}
                  disabled={analyzing || parsing}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleParseUrl}
                  disabled={analyzing || parsing || !jobPostingUrl.trim()}
                >
                  {parsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "자동 추출"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">URL을 입력하고 &quot;자동 추출&quot;을 클릭하면 채용공고 텍스트를 자동으로 가져옵니다</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="job_text">
                채용공고 본문 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="job_text"
                placeholder="채용공고 전문을 붙여넣으세요..."
                rows={10}
                value={jobPostingText}
                onChange={(e) => setJobPostingText(e.target.value)}
                disabled={analyzing}
              />
              <p className="text-xs text-muted-foreground">
                자격요건, 우대사항, 직무설명 등을 포함하면 더 정확한 분석이 가능합니다
              </p>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                checked={webSearch}
                onChange={(e) => setWebSearch(e.target.checked)}
                disabled={analyzing}
                className="h-4 w-4 rounded border-input"
              />
              <div>
                <p className="text-sm font-medium">웹 리서치 포함</p>
                <p className="text-xs text-muted-foreground">기업 최신 뉴스, 문화, 채용 트렌드를 웹에서 검색하여 분석에 반영합니다</p>
              </div>
            </label>

            <Button
              type="submit"
              className="w-full"
              disabled={analyzing || !companyName.trim() || !jobPostingText.trim()}
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  분석 중...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  분석 시작
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
