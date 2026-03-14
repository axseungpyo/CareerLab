"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
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

  async function handleExport() {
    window.open(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/resume/${resumeId}/export`,
      "_blank"
    );
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
          <Button variant="outline" onClick={handleExport}>
            DOCX 내보내기
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              router.push(
                `/review?resume_id=${resumeId}`
              )
            }
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
                  <Badge variant="secondary">v{item.version}</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing === item.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={8}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSaveItem(item.id)}
                    >
                      저장
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(null)}
                    >
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
