"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Loader2, Copy } from "lucide-react";
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

function groupByQuestion(items: ResumeItem[]): QuestionGroup[] {
  const map = new Map<string, QuestionGroup>();
  for (const item of items) {
    const key = item.question;
    if (!map.has(key)) {
      map.set(key, { question: key, charLimit: item.char_limit, items: [] });
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

  // Add new item
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newCharLimit, setNewCharLimit] = useState(500);
  const [addSaving, setAddSaving] = useState(false);

  const resumeId = params.id as string;

  useEffect(() => { loadResume(); }, [resumeId]);

  async function loadResume() {
    try {
      const r = await api.get<ResumeDetail>(`/api/resume/${resumeId}`);
      setResume(r);
      // Set active version to latest for each question
      const groups = groupByQuestion(r.resume_items);
      const initial: Record<string, string> = {};
      for (const g of groups) {
        initial[g.question] = g.items[g.items.length - 1].id;
      }
      setActiveVersion(initial);
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

  async function handleDeleteItem(itemId: string, question: string) {
    if (!confirm(`이 버전을 삭제하시겠습니까?`)) return;
    try {
      await api.delete(`/api/resume/items/${itemId}`);
      toast.success("삭제되었습니다.");
      loadResume();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  }

  async function handleAddVersion(question: string, charLimit: number | undefined, currentCount: number) {
    if (currentCount >= 3) { toast.error("최대 3개 버전까지 추가 가능합니다."); return; }
    setAddSaving(true);
    try {
      await api.post("/api/resume/items", {
        resume_id: resumeId,
        question,
        answer: "(작성 예정)",
        char_limit: charLimit,
        version: currentCount + 1,
      });
      toast.success(`${currentCount + 1}안이 추가되었습니다.`);
      loadResume();
    } catch {
      toast.error("버전 추가에 실패했습니다.");
    } finally {
      setAddSaving(false);
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

  async function handleExport(format: string = "docx") {
    window.open(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/resume/${resumeId}/export?format=${format}`,
      "_blank"
    );
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">로딩 중...</div>;
  if (!resume) return <div className="text-center py-12 text-muted-foreground">자소서를 찾을 수 없습니다.</div>;

  const groups = groupByQuestion(resume.resume_items);

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
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">작성중</SelectItem>
              <SelectItem value="final">완성</SelectItem>
              <SelectItem value="submitted">제출</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => handleExport("docx")}>내보내기</Button>
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
            const isEditing = editing === activeItem?.id;

            return (
              <Card key={gi}>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center justify-between gap-2">
                    {isEditing ? (
                      <Input
                        value={editQuestion}
                        onChange={(e) => setEditQuestion(e.target.value)}
                        className="flex-1 text-sm font-semibold"
                      />
                    ) : (
                      <span className="flex-1">{gi + 1}. {group.question}</span>
                    )}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {group.charLimit && (
                        <Badge variant="outline" className="text-[10px]">
                          {(isEditing ? editText : activeItem?.answer || "").length}/{group.charLimit}자
                        </Badge>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Version Tabs */}
                  <div className="flex items-center gap-1.5">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => { setEditing(null); setActiveVersion((prev) => ({ ...prev, [group.question]: item.id })); }}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                          item.id === activeId
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {item.version}안
                      </button>
                    ))}
                    {group.items.length < 3 && (
                      <button
                        onClick={() => handleAddVersion(group.question, group.charLimit, group.items.length)}
                        disabled={addSaving}
                        className="px-2 py-1 text-xs text-muted-foreground rounded-md border border-dashed hover:border-primary hover:text-primary transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                    <div className="flex-1" />
                    {!isEditing && activeItem && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => { setEditing(activeItem.id); setEditText(activeItem.answer); setEditQuestion(group.question); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteItem(activeItem.id, group.question)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Content */}
                  {activeItem && isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={10}
                        className="text-sm leading-relaxed"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveItem(activeItem.id)}>저장</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditing(null)}>취소</Button>
                      </div>
                    </div>
                  ) : activeItem ? (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{activeItem.answer}</p>
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
