"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import {
  Building2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  FileText,
} from "lucide-react";

const STEPS = ["기업 선택", "문항 설정", "자소서 생성"] as const;

interface QuestionRow {
  question: string;
  charLimit: number;
}

interface GeneratingItem {
  question: string;
  charLimit: number;
  status: "waiting" | "generating" | "done";
  text: string;
  expanded: boolean;
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

  // Step 2
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [tone, setTone] = useState("전문적");

  // Step 3
  const [items, setItems] = useState<GeneratingItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const abortRef = useRef(false);

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
        setQuestions(
          qs.map((q) => ({ question: q.question, charLimit: q.char_limit || 500 }))
        );
      } else {
        setQuestions([{ question: "", charLimit: 500 }]);
      }
    } catch {
      setQuestions([{ question: "", charLimit: 500 }]);
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

  function addQuestion() {
    setQuestions((prev) => [...prev, { question: "", charLimit: 500 }]);
  }

  function removeQuestion(idx: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateQuestion(idx: number, field: keyof QuestionRow, value: string | number) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q))
    );
  }

  async function startGeneration() {
    const valid = questions.filter((q) => q.question.trim());
    if (valid.length === 0) {
      toast.error("최소 1개의 문항을 입력해주세요.");
      return;
    }
    if (!profile) {
      toast.error("프로필을 먼저 등록해주세요.");
      return;
    }
    if (!selectedAnalysis) return;

    const initial: GeneratingItem[] = valid.map((q) => ({
      question: q.question,
      charLimit: q.charLimit,
      status: "waiting",
      text: "",
      expanded: false,
    }));
    setItems(initial);
    setStep(2);
    abortRef.current = false;

    for (let i = 0; i < initial.length; i++) {
      if (abortRef.current) break;
      setItems((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: "generating", expanded: true } : it))
      );
      try {
        await api.stream(
          "/api/resume/generate",
          {
            profile_id: profile.id,
            company_analysis_id: selectedAnalysis.id,
            question: initial[i].question,
            char_limit: initial[i].charLimit,
            tone,
          },
          (chunk) => {
            setItems((prev) =>
              prev.map((it, idx) => (idx === i ? { ...it, text: it.text + chunk } : it))
            );
          },
          () => {
            setItems((prev) =>
              prev.map((it, idx) =>
                idx === i ? { ...it, status: "done", expanded: true } : it
              )
            );
          }
        );
      } catch (e) {
        toast.error(`Q${i + 1} 생성 실패: ${e instanceof Error ? e.message : ""}`);
        setItems((prev) =>
          prev.map((it, idx) => (idx === i ? { ...it, status: "done" } : it))
        );
      }
    }
    toast.success("전체 생성 완료!");
  }

  async function regenerateItem(idx: number) {
    if (!profile || !selectedAnalysis) return;
    const target = items[idx];
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx ? { ...it, status: "generating", text: "", expanded: true } : it
      )
    );
    try {
      await api.stream(
        "/api/resume/generate",
        {
          profile_id: profile.id,
          company_analysis_id: selectedAnalysis.id,
          question: target.question,
          char_limit: target.charLimit,
          tone,
        },
        (chunk) => {
          setItems((prev) =>
            prev.map((it, i) => (i === idx ? { ...it, text: it.text + chunk } : it))
          );
        },
        () => {
          setItems((prev) =>
            prev.map((it, i) => (i === idx ? { ...it, status: "done", expanded: true } : it))
          );
          toast.success(`Q${idx + 1} 재생성 완료`);
        }
      );
    } catch (e) {
      toast.error(`재생성 실패: ${e instanceof Error ? e.message : ""}`);
    }
  }

  async function handleSaveAll() {
    if (!profile || !selectedAnalysis) return;
    const doneItems = items.filter((it) => it.status === "done" && it.text);
    if (doneItems.length === 0) {
      toast.error("저장할 자소서가 없습니다.");
      return;
    }
    setSaving(true);
    try {
      const resume = await api.post<{ id: string }>("/api/resume", {
        profile_id: profile.id,
        company_analysis_id: selectedAnalysis.id,
        title: `${selectedAnalysis.company_name} 자소서`,
      });
      for (const item of doneItems) {
        await api.post("/api/resume/items", {
          resume_id: resume.id,
          question: item.question,
          answer: item.text,
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

  function toggleExpand(idx: number) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, expanded: !it.expanded } : it))
    );
  }

  const statusIcon = (s: GeneratingItem["status"]) =>
    s === "done" ? <Check className="w-4 h-4 text-green-500" /> :
    s === "generating" ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> :
    <span className="w-4 h-4 text-muted-foreground text-xs">&#9203;</span>;

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

      {/* Step 2: 문항 설정 */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" /> 문항 설정
              <Badge variant="outline" className="ml-auto">{selectedAnalysis?.company_name}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                이 기업의 기출문항이 없습니다. 직접 추가해 주세요.
              </p>
            ) : (
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="text-sm font-medium mt-2 shrink-0 w-8">Q{i + 1}.</span>
                    <Textarea
                      value={q.question}
                      onChange={(e) => updateQuestion(i, "question", e.target.value)}
                      rows={2}
                      placeholder="자소서 문항을 입력하세요"
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={q.charLimit}
                      onChange={(e) => updateQuestion(i, "charLimit", parseInt(e.target.value) || 0)}
                      className="w-20"
                      placeholder="글자수"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeQuestion(i)}
                      disabled={questions.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button variant="outline" size="sm" onClick={addQuestion} className="gap-1">
              <Plus className="w-4 h-4" /> 문항 추가
            </Button>

            <div className="flex items-center gap-3 pt-2 border-t">
              <span className="text-sm font-medium shrink-0">톤</span>
              <Select value={tone} onValueChange={(v) => v && setTone(v)}>
                <SelectTrigger className="w-40">
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

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(0)}>
                이전
              </Button>
              <Button
                onClick={startGeneration}
                disabled={questions.every((q) => !q.question.trim())}
                className="btn-gradient border-0"
              >
                전체 생성 시작
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: 멀티 문항 순차 생성 */}
      {step === 2 && (
        <div className="space-y-4">
          {items.map((item, i) => (
            <Card key={i} className={item.status === "waiting" ? "opacity-50" : ""}>
              <CardHeader
                className="cursor-pointer py-3"
                onClick={() => item.status === "done" && toggleExpand(i)}
              >
                <div className="flex items-center gap-2">
                  {statusIcon(item.status)}
                  <span className="font-medium text-sm flex-1">
                    Q{i + 1}. {item.question} ({item.charLimit}자)
                  </span>
                  {item.status === "done" && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); regenerateItem(i); }}
                      >
                        다시 생성
                      </Button>
                      {item.expanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </>
                  )}
                  {item.status === "generating" && (
                    <span className="text-xs text-muted-foreground">{item.text.length}자</span>
                  )}
                </div>
              </CardHeader>
              {item.status === "generating" && (
                <CardContent className="pt-0">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed p-3 bg-muted rounded-md max-h-60 overflow-y-auto">
                    {item.text || "생성 중..."}
                  </div>
                </CardContent>
              )}
              {item.status === "done" && item.expanded && (
                <CardContent className="pt-0 space-y-2">
                  <Textarea
                    value={item.text}
                    onChange={(e) => {
                      const val = e.target.value;
                      setItems((prev) =>
                        prev.map((it, idx) => (idx === i ? { ...it, text: val } : it))
                      );
                    }}
                    rows={10}
                    className="text-sm leading-relaxed"
                  />
                  <div className="flex items-center justify-between">
                    <p className={`text-xs ${item.charLimit && item.text.length > item.charLimit ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      {item.text.length}{item.charLimit ? `/${item.charLimit}` : ""}자
                    </p>
                  </div>
                </CardContent>
              )}
              {item.status === "done" && !item.expanded && item.text && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground truncate">
                    {item.text.slice(0, 100)}...
                  </p>
                </CardContent>
              )}
            </Card>
          ))}

          {items.every((it) => it.status === "done") && (
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                문항 수정
              </Button>
              <Button
                onClick={handleSaveAll}
                disabled={saving || items.every((it) => !it.text)}
                className="btn-gradient border-0 gap-1"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                전체 저장
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
