"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { History, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function ResumeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [resume, setResume] = useState<ResumeDetail | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [loading, setLoading] = useState(true);
  const [versionPanel, setVersionPanel] = useState<string | null>(null);
  const [versions, setVersions] = useState<ResumeItem[]>([]);

  const resumeId = params.id as string;

  useEffect(() => {
    loadResume();
  }, [resumeId]);

  async function loadResume() {
    try {
      const r = await api.get<ResumeDetail>(`/api/resume/${resumeId}`);
      setResume(r);
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
    await api.put(`/api/resume/items/${itemId}`, { answer: editText });
    toast.success("수정되었습니다.");
    setEditing(null);
    loadResume();
  }

  async function handleExport(format: string = "docx") {
    window.open(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/resume/${resumeId}/export?format=${format}`,
      "_blank"
    );
  }

  async function loadVersions(item: ResumeItem) {
    if (versionPanel === item.id) {
      setVersionPanel(null);
      return;
    }
    try {
      const v = await api.get<ResumeItem[]>(
        `/api/resume/${resumeId}/items/versions?question=${encodeURIComponent(item.question)}`
      );
      setVersions(v);
      setVersionPanel(item.id);
    } catch {
      toast.error("버전 목록을 불러올 수 없습니다.");
    }
  }

  async function handleRestoreVersion(versionItem: ResumeItem, currentItemId: string) {
    try {
      await api.put(`/api/resume/items/${currentItemId}`, {
        answer: versionItem.answer,
      });
      toast.success(`v${versionItem.version} 버전으로 복원되었습니다.`);
      setVersionPanel(null);
      loadResume();
    } catch {
      toast.error("복원에 실패했습니다.");
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">로딩 중...</div>;
  }

  if (!resume) {
    return <div className="text-center py-12 text-muted-foreground">자소서를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{resume.title}</h1>
          {resume.company_analyses && (
            <p className="text-muted-foreground">
              {resume.company_analyses.company_name}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Select value={resume.status} onValueChange={(v) => v && handleStatusChange(v)}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">작성중</SelectItem>
              <SelectItem value="final">완성</SelectItem>
              <SelectItem value="submitted">제출</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => handleExport("docx")}>
            DOCX 내보내기
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/review?resume_id=${resumeId}`)}
          >
            첨삭 분석
          </Button>
        </div>
      </div>

      <Separator />

      {resume.resume_items.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">문항이 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        resume.resume_items.map((item, i) => (
          <Card key={item.id}>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>
                  {i + 1}. {item.question}
                </span>
                <div className="flex items-center gap-2">
                  {item.char_limit && (
                    <Badge variant="outline">
                      {item.answer.length}/{item.char_limit}자
                    </Badge>
                  )}
                  <button
                    onClick={() => loadVersions(item)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <History className="h-3 w-3" />
                    v{item.version}
                    <ChevronDown className={`h-3 w-3 transition-transform ${versionPanel === item.id ? "rotate-180" : ""}`} />
                  </button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Version History Panel */}
              {versionPanel === item.id && versions.length > 0 && (
                <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    버전 이력 ({versions.length}개)
                  </p>
                  {versions.map((v) => (
                    <div
                      key={v.id}
                      className={`flex items-center justify-between p-2 rounded text-xs ${
                        v.id === item.id
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Badge variant={v.id === item.id ? "default" : "secondary"} className="text-[10px] shrink-0">
                          v{v.version}
                        </Badge>
                        <span className="truncate text-muted-foreground">
                          {v.answer.slice(0, 60)}...
                        </span>
                      </div>
                      {v.id !== item.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[10px] h-6 shrink-0"
                          onClick={() => handleRestoreVersion(v, item.id)}
                        >
                          복원
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Edit / View */}
              {editing === item.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={8}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSaveItem(item.id)}>
                      저장
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {item.answer}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setEditing(item.id);
                      setEditText(item.answer);
                    }}
                  >
                    수정
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
