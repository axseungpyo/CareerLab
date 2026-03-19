"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Loader2, Copy, ChevronUp, ChevronDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import type { ResumeItem } from "@/lib/types";

interface ResumeDetail {
  id: string;
  title: string;
  status: string;
  result: string | null;
  created_at: string;
  profile_id: string;
  company_analysis_id: string;
  resume_items: ResumeItem[];
  company_analyses: { company_name: string } | null;
}

interface QuestionGroup {
  question: string;
  charLimit: number | undefined;
  items: ResumeItem[];
}

function parseCharLimit(text: string): number | undefined {
  // 영문 글자수 제외: "(영문작성 시 1400자)" 부분 제거 후 파싱
  const cleaned = text.replace(/\(?\s*영문\s*작성\s*시?\s*\d[,\d]*\s*자\s*\)?/g, "");

  // "최대 800자" 패턴 우선
  const maxMatch = cleaned.match(/최대\s*(\d[,\d]*)\s*자/);
  if (maxMatch) return parseInt(maxMatch[1].replace(",", ""), 10);

  // "1500자 이내", "700자", "(800자)" 등
  const patterns = [
    /(\d{1,2},\d{3})\s*자/,      // 1,000자 / 1,500자
    /(\d{3,4})\s*자/,            // 500자 / 800자 / 1500자
    /글자\s*수[:\s]*(\d+)/,      // 글자수: 500
  ];
  for (const pat of patterns) {
    const m = cleaned.match(pat);
    if (m) return parseInt(m[1].replace(",", ""), 10);
  }
  return undefined;
}

function groupByQuestion(items: ResumeItem[]): QuestionGroup[] {
  const map = new Map<string, QuestionGroup>();
  for (const item of items) {
    const key = item.question;
    if (!map.has(key)) {
      // 문항 텍스트에 명시된 글자수를 우선, 없으면 DB 값 사용
      const parsed = parseCharLimit(item.question);
      const charLimit = parsed || item.char_limit;
      map.set(key, { question: key, charLimit, items: [] });
    }
    map.get(key)!.items.push(item);
  }
  // Sort versions within each group
  for (const group of map.values()) {
    group.items.sort((a, b) => a.version - b.version);
  }
  return Array.from(map.values());
}

export default function ResumeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [resume, setResume] = useState<ResumeDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editQuestion, setEditQuestion] = useState("");

  // Active version per question group
  const [activeVersion, setActiveVersion] = useState<Record<string, string>>({});

  // Version labels (stored in localStorage)
  const [versionLabels, setVersionLabels] = useState<Record<string, string>>({});
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [labelText, setLabelText] = useState("");

  // Question order
  const [questionOrder, setQuestionOrder] = useState<string[]>([]);

  // Add new item
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newCharLimit, setNewCharLimit] = useState(500);
  const [addSaving, setAddSaving] = useState(false);

  const resumeId = params.id as string;

  useEffect(() => { loadResume(); loadLabels(); }, [resumeId]);

  function loadLabels() {
    try {
      const stored = localStorage.getItem(`resume-labels-${resumeId}`);
      if (stored) setVersionLabels(JSON.parse(stored));
    } catch { /* ignore */ }
  }

  function saveLabel(itemId: string, label: string) {
    const updated = { ...versionLabels, [itemId]: label };
    setVersionLabels(updated);
    localStorage.setItem(`resume-labels-${resumeId}`, JSON.stringify(updated));
    setEditingLabel(null);
  }

  function getLabel(item: { id: string; version: number }) {
    return versionLabels[item.id] || `${item.version}안`;
  }

  async function loadResume() {
    try {
      const r = await api.get<ResumeDetail>(`/api/resume/${resumeId}`);
      setResume(r);
      const groups = groupByQuestion(r.resume_items);
      // Set active version to latest for each question
      const initial: Record<string, string> = {};
      for (const g of groups) {
        initial[g.question] = g.items[g.items.length - 1].id;
      }
      setActiveVersion(initial);
      // Preserve existing order, append new questions
      setQuestionOrder((prev) => {
        const newQuestions = groups.map((g) => g.question);
        if (prev.length === 0) return newQuestions;
        const kept = prev.filter((q) => newQuestions.includes(q));
        const added = newQuestions.filter((q) => !kept.includes(q));
        return [...kept, ...added];
      });
    } catch {
      toast.error("자소서를 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(status: string) {
    await api.put(`/api/resume/${resumeId}/status`, { status });
    toast.success("상태가 변경되었습니다.");
    loadResume();
  }

  async function handleSaveItem(itemId: string) {
    try {
      const payload: Record<string, string> = { answer: editText };
      if (editQuestion) payload.question = editQuestion;
      await api.put(`/api/resume/items/${itemId}`, payload);
      toast.success("수정되었습니다.");
      setEditing(null);
      loadResume();
    } catch {
      toast.error("수정에 실패했습니다.");
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!itemId || !confirm(`이 버전을 삭제하시겠습니까?`)) return;
    try {
      await api.delete(`/api/resume/items/${itemId}`);
      // Clean up label
      const updated = { ...versionLabels };
      delete updated[itemId];
      setVersionLabels(updated);
      localStorage.setItem(`resume-labels-${resumeId}`, JSON.stringify(updated));
      toast.success("삭제되었습니다.");
      loadResume();
    } catch (e) {
      toast.error("삭제에 실패했습니다: " + (e instanceof Error ? e.message : ""));
    }
  }

  async function handleAddVersion(question: string, charLimit: number | undefined, items: ResumeItem[]) {
    const maxVersion = items.reduce((max, it) => Math.max(max, it.version), 0);
    setAddSaving(true);
    try {
      await api.post("/api/resume/items", {
        resume_id: resumeId,
        question,
        answer: "(작성 예정)",
        char_limit: charLimit,
        version: maxVersion + 1,
      });
      toast.success(`${maxVersion + 1}안이 추가되었습니다.`);
      loadResume();
    } catch {
      toast.error("버전 추가에 실패했습니다.");
    } finally {
      setAddSaving(false);
    }
  }

  async function handleRenameQuestion(group: QuestionGroup, newQuestion: string) {
    if (!newQuestion.trim() || newQuestion === group.question) { setEditing(null); return; }
    try {
      for (const item of group.items) {
        await api.put(`/api/resume/items/${item.id}`, { question: newQuestion });
      }
      toast.success("문항 제목이 변경되었습니다.");
      setEditing(null);
      loadResume();
    } catch {
      toast.error("제목 변경에 실패했습니다.");
    }
  }

  async function handleAddItem() {
    if (!newQuestion.trim()) { toast.error("문항을 입력해주세요."); return; }
    setAddSaving(true);
    try {
      await api.post("/api/resume/items", {
        resume_id: resumeId,
        question: newQuestion,
        answer: newAnswer || "(작성 예정)",
        char_limit: newCharLimit || undefined,
      });
      toast.success("문항이 추가되었습니다.");
      setShowAddForm(false);
      setNewQuestion("");
      setNewAnswer("");
      setNewCharLimit(500);
      loadResume();
    } catch {
      toast.error("문항 추가에 실패했습니다.");
    } finally {
      setAddSaving(false);
    }
  }

  function moveQuestion(index: number, direction: "up" | "down") {
    setQuestionOrder((prev) => {
      const next = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleExport(format: string = "docx") {
    window.open(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/resume/${resumeId}/export?format=${format}`,
      "_blank"
    );
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">로딩 중...</div>;
  if (!resume) return <div className="text-center py-12 text-muted-foreground">자소서를 찾을 수 없습니다.</div>;

  const rawGroups = groupByQuestion(resume.resume_items);
  const groups = questionOrder.length > 0
    ? questionOrder.map((q) => rawGroups.find((g) => g.question === q)).filter(Boolean) as QuestionGroup[]
    : rawGroups;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{resume.title}</h1>
          {resume.company_analyses && (
            <p className="text-muted-foreground">{resume.company_analyses.company_name}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Select value={resume.status} onValueChange={(v) => v && handleStatusChange(v)}>
            <SelectTrigger className="w-28">
              <SelectValue>
                {{ draft: "작성중", final: "완성", submitted: "제출" }[resume.status] || resume.status}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">작성중</SelectItem>
              <SelectItem value="final">완성</SelectItem>
              <SelectItem value="submitted">제출</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
              <Download className="h-4 w-4" />내보내기
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("docx")}>Word (.docx)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pdf")}>PDF (.pdf)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("html")}>HTML (.html)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("md")}>Markdown (.md)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("txt")}>텍스트 (.txt)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("json")}>JSON (.json)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => router.push(`/review?resume_id=${resumeId}`)}>첨삭 분석</Button>
        </div>
      </div>

      <Separator />

      {/* Question Groups */}
      {groups.length === 0 && !showAddForm ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">문항이 없습니다.</p>
            <Button onClick={() => setShowAddForm(true)} className="gap-1">
              <Plus className="w-4 h-4" /> 문항 추가
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {groups.map((group, gi) => {
            const activeId = activeVersion[group.question];
            const activeItem = group.items.find((it) => it.id === activeId) || group.items[0];
            // editing === activeItem?.id → 내용 수정, editing === `title-${gi}` → 제목 수정

            return (
              <Card key={gi}>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center justify-between gap-2">
                    {editing === `title-${gi}` ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <Input
                          value={editQuestion}
                          onChange={(e) => setEditQuestion(e.target.value)}
                          className="flex-1 text-sm font-semibold h-8"
                          onKeyDown={(e) => { if (e.key === "Enter") handleRenameQuestion(group, editQuestion); }}
                          autoFocus
                        />
                        <Button size="sm" className="h-7 text-xs" onClick={() => handleRenameQuestion(group, editQuestion)}>확인</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(null)}>취소</Button>
                      </div>
                    ) : (
                      <span
                        className="flex-1 cursor-pointer hover:text-primary transition-colors"
                        onClick={() => { setEditing(`title-${gi}`); setEditQuestion(group.question); }}
                        title="클릭하여 제목 수정"
                      >
                        {gi + 1}. {group.question}
                      </span>
                    )}
                    <div className="flex items-center gap-1 shrink-0">
                      {groups.length > 1 && (
                        <div className="flex flex-col -space-y-1 mr-1">
                          <Button variant="ghost" size="icon" className="h-5 w-5" disabled={gi === 0} onClick={() => moveQuestion(gi, "up")}>
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5" disabled={gi === groups.length - 1} onClick={() => moveQuestion(gi, "down")}>
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      {group.charLimit != null && group.charLimit > 0 && (() => {
                        const currentLen = (editing === activeItem?.id ? editText : activeItem?.answer || "").length;
                        const over = currentLen > group.charLimit;
                        return (
                          <Badge variant="outline" className={`text-[10px] ${over ? "border-destructive text-destructive" : ""}`}>
                            {currentLen}/{group.charLimit}자
                          </Badge>
                        );
                      })()}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Version Tabs */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {group.items.map((item) => (
                      editingLabel === item.id ? (
                        <input
                          key={item.id}
                          value={labelText}
                          onChange={(e) => setLabelText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveLabel(item.id, labelText); if (e.key === "Escape") setEditingLabel(null); }}
                          onBlur={() => saveLabel(item.id, labelText)}
                          className="px-2 py-0.5 text-xs font-medium rounded-md border border-primary bg-background w-20 outline-none"
                          autoFocus
                        />
                      ) : (
                        <button
                          key={item.id}
                          onClick={() => { setEditing(null); setEditingLabel(null); setActiveVersion((prev) => ({ ...prev, [group.question]: item.id })); }}
                          onDoubleClick={(e) => { e.stopPropagation(); setEditingLabel(item.id); setLabelText(getLabel(item)); }}
                          title="클릭: 선택 / 더블클릭: 라벨 수정"
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                            item.id === activeId
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {getLabel(item)}
                        </button>
                      )
                    ))}
                    <button
                      onClick={() => handleAddVersion(group.question, group.charLimit, group.items)}
                      disabled={addSaving}
                      className="px-2 py-1 text-xs text-muted-foreground rounded-md border border-dashed hover:border-primary hover:text-primary transition-colors"
                      title="새 버전 추가"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <div className="flex-1" />
                    {editing !== activeItem?.id && activeItem && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => { setEditing(activeItem.id); setEditText(activeItem.answer); setEditQuestion(group.question); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteItem(activeItem.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Content */}
                  {activeItem && editing === activeItem.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={10}
                        className="text-sm leading-relaxed"
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSaveItem(activeItem.id)}>저장</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditing(null)}>취소</Button>
                        </div>
                        <p className={`text-xs ${group.charLimit && editText.length > group.charLimit ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                          {editText.length}{group.charLimit ? `/${group.charLimit}` : ""}자
                        </p>
                      </div>
                    </div>
                  ) : activeItem ? (
                    <div>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{activeItem.answer}</p>
                      {group.charLimit != null && group.charLimit > 0 && (
                        <p className={`text-xs mt-2 text-right ${activeItem.answer.length > group.charLimit ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                          {activeItem.answer.length}/{group.charLimit}자
                        </p>
                      )}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </>
      )}

      {/* Add Item Form */}
      {showAddForm && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">새 문항 추가</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="자소서 문항을 입력하세요" className="flex-1 text-sm" />
              <Input type="number" value={newCharLimit} onChange={(e) => setNewCharLimit(parseInt(e.target.value) || 0)}
                className="w-24 text-sm" placeholder="글자수" />
            </div>
            <Textarea value={newAnswer} onChange={(e) => setNewAnswer(e.target.value)}
              rows={5} placeholder="답변을 작성하세요 (비워두면 '작성 예정'으로 저장)" className="text-sm" />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddItem} disabled={addSaving} className="gap-1">
                {addSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}추가
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>취소</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {groups.length > 0 && !showAddForm && (
        <Button variant="outline" onClick={() => setShowAddForm(true)} className="w-full gap-1">
          <Plus className="w-4 h-4" /> 문항 추가
        </Button>
      )}
    </div>
  );
}
