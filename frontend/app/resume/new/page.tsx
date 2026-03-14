"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import type { CompanyAnalysis, Profile } from "@/lib/types";

type Step = "input" | "analyzing" | "matched" | "generating";

export default function NewResumePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");

  // Step 1: Input
  const [companyName, setCompanyName] = useState("");
  const [jobPosting, setJobPosting] = useState("");
  const [jobUrl, setJobUrl] = useState("");

  // Step 2: Analysis result
  const [analysis, setAnalysis] = useState<CompanyAnalysis | null>(null);
  const [analysisDetail, setAnalysisDetail] = useState<Record<string, unknown>>({});

  // Step 3: Generation options
  const [question, setQuestion] = useState("");
  const [charLimit, setCharLimit] = useState("");
  const [tone, setTone] = useState("전문적");

  // Step 4: Streaming output
  const [generatedText, setGeneratedText] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);

  async function handleAnalyze() {
    if (!companyName || !jobPosting) {
      toast.error("기업명과 채용공고를 입력해주세요.");
      return;
    }
    setStep("analyzing");
    try {
      const result = await api.post<CompanyAnalysis & { analysis: Record<string, unknown> }>(
        "/api/resume/analyze-company",
        {
          company_name: companyName,
          job_posting_text: jobPosting,
          job_posting_url: jobUrl || undefined,
        }
      );
      setAnalysis(result);
      setAnalysisDetail(result.analysis || {});

      // Load profile
      const p = await api.get<Profile | null>("/api/profile");
      setProfile(p);

      setStep("matched");
    } catch (e) {
      toast.error("분석 실패: " + (e instanceof Error ? e.message : ""));
      setStep("input");
    }
  }

  async function handleGenerate() {
    if (!profile || !analysis) {
      toast.error("프로필과 기업 분석이 필요합니다.");
      return;
    }
    if (!question) {
      toast.error("자소서 문항을 입력해주세요.");
      return;
    }
    setStep("generating");
    setGeneratedText("");

    try {
      await api.stream(
        "/api/resume/generate",
        {
          profile_id: profile.id,
          company_analysis_id: analysis.id,
          question,
          char_limit: charLimit ? parseInt(charLimit) : null,
          tone,
        },
        (chunk) => setGeneratedText((prev) => prev + chunk),
        () => toast.success("자소서 생성 완료!")
      );
    } catch (e) {
      toast.error("생성 실패: " + (e instanceof Error ? e.message : ""));
    }
  }

  async function handleSave() {
    if (!profile || !analysis || !generatedText) return;

    const resume = await api.post<{ id: string }>("/api/resume", {
      profile_id: profile.id,
      company_analysis_id: analysis.id,
      title: `${companyName} 자소서`,
    });

    await api.post("/api/resume/items", {
      resume_id: resume.id,
      question,
      answer: generatedText,
      char_limit: charLimit ? parseInt(charLimit) : null,
      tone,
    });

    toast.success("자소서가 저장되었습니다.");
    router.push(`/resume/${resume.id}`);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">새 자소서 생성</h1>

      {/* Progress */}
      <div className="flex items-center gap-3">
        {(["입력", "분석", "매칭", "생성"] as const).map((label, i) => {
          const steps: Step[] = ["input", "analyzing", "matched", "generating"];
          const currentIdx = steps.indexOf(step);
          return (
            <div key={label} className="flex items-center gap-3">
              {i > 0 && (
                <div className={`w-6 h-0.5 rounded ${i <= currentIdx ? "bg-primary" : "bg-muted"}`} />
              )}
              <Badge
                variant={i <= currentIdx ? "default" : "secondary"}
                className="px-3 py-1"
              >
                {i + 1}. {label}
              </Badge>
            </div>
          );
        })}
      </div>

      {/* Step 1: Company Input */}
      {step === "input" && (
        <Card>
          <CardHeader>
            <CardTitle>채용공고 입력</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label>기업명 *</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="예: 삼성전자"
              />
            </div>
            <div className="space-y-1.5">
              <Label>채용공고 URL (선택)</Label>
              <Input
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>채용공고 본문 *</Label>
              <Textarea
                value={jobPosting}
                onChange={(e) => setJobPosting(e.target.value)}
                rows={8}
                placeholder="채용공고 내용을 붙여넣기 하세요"
              />
            </div>
            <Button onClick={handleAnalyze} disabled={!companyName || !jobPosting} className="btn-gradient border-0">
              기업 분석 시작
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Analyzing */}
      {step === "analyzing" && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">기업을 분석하고 있습니다...</p>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Analysis Result + Generation Options */}
      {step === "matched" && analysis && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>기업 분석 결과</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.requirements && (
                <div>
                  <p className="text-sm font-medium">요구사항</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(analysis.requirements as string[]).map((r, i) => (
                      <Badge key={i} variant="outline">
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {analysis.keywords && (
                <div>
                  <p className="text-sm font-medium">핵심 키워드</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {analysis.keywords.map((k, i) => (
                      <Badge key={i} variant="secondary">
                        {k}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {typeof analysisDetail.tips === "string" && (
                <div>
                  <p className="text-sm font-medium">작성 팁</p>
                  <p className="text-sm text-muted-foreground">
                    {analysisDetail.tips}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>자소서 생성 옵션</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label>자소서 문항 *</Label>
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={2}
                  placeholder="예: 지원 동기와 입사 후 포부를 작성해주세요."
                />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label>글자수 제한</Label>
                  <Input
                    type="number"
                    value={charLimit}
                    onChange={(e) => setCharLimit(e.target.value)}
                    placeholder="예: 500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>톤</Label>
                  <Select value={tone} onValueChange={(v) => v && setTone(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="전문적">전문적</SelectItem>
                      <SelectItem value="진솔한">진솔한</SelectItem>
                      <SelectItem value="열정적">열정적</SelectItem>
                      <SelectItem value="차분한">차분한</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleGenerate} disabled={!question} className="btn-gradient border-0">
                자소서 생성
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* Step 4: Streaming Output */}
      {step === "generating" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              생성 결과
              {generatedText && (
                <span className="text-sm font-normal text-muted-foreground">
                  {generatedText.length}자
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm leading-relaxed min-h-[200px] p-4 bg-muted rounded-md">
              {generatedText || "생성 중..."}
            </div>
            {generatedText && (
              <div className="flex gap-2 mt-4">
                <Button onClick={handleSave}>저장</Button>
                <Button variant="outline" onClick={() => setStep("matched")}>
                  다시 생성
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
