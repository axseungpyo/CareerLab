"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { CompanyAnalysis, EssayQuestion, Profile } from "@/lib/types";
import { Building2, Plus, Trash2, Loader2, Check, FileText } from "lucide-react";

const STEPS = ["기업 선택", "자소서 작성"] as const;

interface EssayItem {
  question: string;
  charLimit: number;
  answer: string;
  status: "idle" | "generating";
}

export default function NewResumePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);

  // Step 1
  const [analyses, setAnalyses] = useState<CompanyAnalysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<CompanyAnalysis | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newCompany, setNewCompany] = useState("");
  const [newPosting, setNewPosting] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  // Step 2: 자소서 작성
  const [essayItems, setEssayItems] = useState<EssayItem[]>([]);
  const [tone, setTone] = useState("전문적");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  // Load analyses on mount
  useEffect(() => {
    api.get<CompanyAnalysis[]>("/api/company").then(setAnalyses).catch(() => {});
    api.get<Profile | null>("/api/profile").then(setProfile).catch(() => {});
  }, []);

  // Auto-select from URL param
  useEffect(() => {
    const id = searchParams.get("analysisId");
    if (!id || analyses.length === 0) return;
    const found = analyses.find((a) => a.id === id);
    if (found) {
      setSelectedAnalysis(found);
      setStep(1);
      toast.success(`"${found.company_name}" 분석을 불러왔습니다.`);
    }
  }, [searchParams, analyses]);

  // Load essay questions when entering Step 2
  const loadEssayQuestions = useCallback(async (companyName: string) => {
    try {
      const qs = await api.get<EssayQuestion[]>(
        `/api/essay-questions?company=${encodeURIComponent(companyName)}`
      );
      if (qs.length > 0) {
        setEssayItems(
          qs.map((q) => ({ question: q.question, charLimit: q.char_limit || 500, answer: "", status: "idle" as const }))
        );
      } else {
        setEssayItems([{ question: "", charLimit: 500, answer: "", status: "idle" }]);
      }
    } catch {
      setEssayItems([{ question: "", charLimit: 500, answer: "", status: "idle" }]);
    }
  }, []);

  async function handleNewAnalysis() {
    if (!newCompany || !newPosting) {
      toast.error("기업명과 채용공고를 입력해주세요.");
      return;
    }
    setAnalyzing(true);
    try {
      const result = await api.post<CompanyAnalysis>("/api/company/analyze", {
        company_name: newCompany,
        job_posting_text: newPosting,
        job_posting_url: newUrl || undefined,
      });
      setAnalyses((prev) => [result, ...prev]);
      setSelectedAnalysis(result);
      setShowNewForm(false);
      setNewCompany("");
      setNewPosting("");
      setNewUrl("");
      toast.success("기업 분석 완료!");
      await loadEssayQuestions(result.company_name);
      setStep(1);
    } catch (e) {
      toast.error("분석 실패: " + (e instanceof Error ? e.message : ""));
    } finally {
      setAnalyzing(false);
    }
  }

  function goToStep2() {
    if (!selectedAnalysis) {
      toast.error("기업을 선택해주세요.");
      return;
    }
    loadEssayQuestions(selectedAnalysis.company_name);
    setStep(1);
  }

  function addEssayItem() {
    setEssayItems((prev) => [...prev, { question: "", charLimit: 500, answer: "", status: "idle" }]);
  }

  function removeEssayItem(idx: number) {
    setEssayItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateEssayItem(idx: number, field: keyof EssayItem, value: string | number) {
    setEssayItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  }

  async function generateSingleItem(idx: number) {
    const item = essayItems[idx];
    if (!item.question.trim()) { toast.error("문항을 입력해주세요."); return; }
    if (!profile) { toast.error("프로필을 먼저 등록해주세요."); return; }
    if (!selectedAnalysis) return;

    setEssayItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, status: "generating", answer: "" } : it))
    );
    try {
      await api.stream(
        "/api/resume/generate",
        {
          profile_id: profile.id,
          company_analysis_id: selectedAnalysis.id,
          question: item.question,
          char_limit: item.charLimit,
          tone,
        },
        (chunk) => {
          setEssayItems((prev) =>
            prev.map((it, i) => (i === idx ? { ...it, answer: it.answer + chunk } : it))
          );
        },
        () => {
          setEssayItems((prev) =>
            prev.map((it, i) => (i === idx ? { ...it, status: "idle" } : it))
          );
          toast.success(`Q${idx + 1} 생성 완료`);
        }
      );
    } catch (e) {
      toast.error(`Q${idx + 1} 생성 실패: ${e instanceof Error ? e.message : ""}`);
      setEssayItems((prev) =>
        prev.map((it, i) => (i === idx ? { ...it, status: "idle" } : it))
      );
    }
  }

  async function handleSaveAll() {
    if (!profile || !selectedAnalysis) return;
    const filled = essayItems.filter((it) => it.question.trim() && it.answer.trim());
    if (filled.length === 0) {
      toast.error("저장할 자소서가 없습니다. 최소 1개 문항에 내용을 작성해주세요.");
      return;
    }
    setSaving(true);
    try {
      const resume = await api.post<{ id: string }>("/api/resume", {
        profile_id: profile.id,
        company_analysis_id: selectedAnalysis.id,
        title: `${selectedAnalysis.company_name} 자소서`,
      });
      for (const item of filled) {
        await api.post("/api/resume/items", {
          resume_id: resume.id,
          question: item.question,
          answer: item.answer,
          char_limit: item.charLimit,
          tone,
        });
      }
      toast.success("자소서가 저장되었습니다.");
      router.push(`/resume/${resume.id}`);
    } catch (e) {
      toast.error("저장 실패: " + (e instanceof Error ? e.message : ""));
    } finally {
      setSaving(false);
    }
  }

  const hasAnyContent = essayItems.some((it) => it.answer.trim());

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">새 자소서 생성</h1>

      {/* Step Bar */}
      <div className="flex items-center gap-3">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-3">
            {i > 0 && (
              <div className={`w-8 h-0.5 rounded ${i <= step ? "bg-primary" : "bg-muted"}`} />
            )}
            <Badge
              variant={i < step ? "default" : i === step ? "default" : "secondary"}
              className="px-3 py-1 gap-1"
            >
              {i < step ? <Check className="w-3 h-3" /> : `${i + 1}`}
              {label}
            </Badge>
          </div>
        ))}
      </div>

      {/* Step 1: 기업 선택 */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" /> 기업 선택
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analyses.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {analyses.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAnalysis(a)}
                    className={`text-left p-4 rounded-lg border-2 transition-colors ${
                      selectedAnalysis?.id === a.id
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/30"
                    }`}
                  >
                    <p className="font-medium">{a.company_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(a.analyzed_at).toLocaleDateString("ko-KR")}
                    </p>
                    {a.keywords && a.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {a.keywords.slice(0, 3).map((k, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {k}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">분석된 기업이 없습니다.</p>
            )}

            {!showNewForm ? (
              <Button variant="outline" onClick={() => setShowNewForm(true)} className="gap-1">
                <Plus className="w-4 h-4" /> 새 기업분석 시작
              </Button>
            ) : (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <Input
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="기업명 (예: 삼성전자)"
                />
                <Textarea
                  value={newPosting}
                  onChange={(e) => setNewPosting(e.target.value)}
                  rows={5}
                  placeholder="채용공고 내용을 붙여넣기 하세요"
                />
                <Input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="채용공고 URL (선택)"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleNewAnalysis}
                    disabled={analyzing || !newCompany || !newPosting}
                    className="btn-gradient border-0 gap-1"
                  >
                    {analyzing && <Loader2 className="w-4 h-4 animate-spin" />}
                    분석 시작
                  </Button>
                  <Button variant="ghost" onClick={() => setShowNewForm(false)}>
                    취소
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={goToStep2} disabled={!selectedAnalysis} className="btn-gradient border-0">
                다음
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: 자소서 작성 (문항 설정 + 생성/직접작성 통합) */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <h2 className="font-semibold">자소서 작성</h2>
              <Badge variant="outline">{selectedAnalysis?.company_name}</Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">톤</span>
              <Select value={tone} onValueChange={(v) => v && setTone(v)}>
                <SelectTrigger className="w-32 h-8 text-sm">
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

          {essayItems.map((item, i) => (
            <Card key={i}>
              <CardHeader className="py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold shrink-0">Q{i + 1}.</span>
                  <Textarea
                    value={item.question}
                    onChange={(e) => updateEssayItem(i, "question", e.target.value)}
                    rows={1}
                    placeholder="자소서 문항을 입력하세요"
                    className="flex-1 text-sm min-h-[36px] resize-none"
                  />
                  <Input
                    type="number"
                    value={item.charLimit}
                    onChange={(e) => updateEssayItem(i, "charLimit", parseInt(e.target.value) || 0)}
                    className="w-20 h-9 text-sm"
                    placeholder="글자수"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => removeEssayItem(i)}
                    disabled={essayItems.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {item.status === "generating" ? (
                  <div className="space-y-2">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed p-3 bg-muted rounded-md max-h-60 overflow-y-auto">
                      {item.answer || "생성 중..."}
                    </div>
                    <p className="text-xs text-muted-foreground">{item.answer.length}자 생성 중...</p>
                  </div>
                ) : (
                  <>
                    <Textarea
                      value={item.answer}
                      onChange={(e) => updateEssayItem(i, "answer", e.target.value)}
                      rows={item.answer ? 8 : 3}
                      placeholder="직접 작성하거나 AI 생성 버튼을 눌러주세요"
                      className="text-sm leading-relaxed"
                    />
                    <div className="flex items-center justify-between">
                      <p className={`text-xs ${item.charLimit && item.answer.length > item.charLimit ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                        {item.answer.length}{item.charLimit ? `/${item.charLimit}` : ""}자
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateSingleItem(i)}
                        disabled={!item.question.trim()}
                        className="gap-1"
                      >
                        {item.answer ? "AI 재생성" : "AI 생성"}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" size="sm" onClick={addEssayItem} className="gap-1">
            <Plus className="w-4 h-4" /> 문항 추가
          </Button>

          <div className="flex justify-between pt-2 border-t">
            <Button variant="outline" onClick={() => setStep(0)}>
              이전
            </Button>
            <Button
              onClick={handleSaveAll}
              disabled={saving || !hasAnyContent}
              className="btn-gradient border-0 gap-1"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              전체 저장
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
