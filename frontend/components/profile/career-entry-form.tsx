"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CareerEntryFormProps {
  profileId: string;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

export default function CareerEntryForm({
  profileId,
  onSubmit,
  onCancel,
}: CareerEntryFormProps) {
  const [entryType, setEntryType] = useState("career");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [starSituation, setStarSituation] = useState("");
  const [starTask, setStarTask] = useState("");
  const [starAction, setStarAction] = useState("");
  const [starResult, setStarResult] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        profile_id: profileId,
        entry_type: entryType,
        title,
        content,
        company: company || undefined,
        position: position || undefined,
        period_start: periodStart || undefined,
        period_end: periodEnd || undefined,
        star_situation: starSituation || undefined,
        star_task: starTask || undefined,
        star_action: starAction || undefined,
        star_result: starResult || undefined,
        tags: tags ? tags.split(",").map((t) => t.trim()) : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          경력/프로젝트 추가
          <Button variant="ghost" size="sm" onClick={onCancel}>
            취소
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>유형</Label>
              <Select value={entryType} onValueChange={(v) => v && setEntryType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="career">경력</SelectItem>
                  <SelectItem value="project">프로젝트</SelectItem>
                  <SelectItem value="skill">역량</SelectItem>
                  <SelectItem value="story">경험 스토리</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>제목 *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="예: 프론트엔드 개발 인턴"
              />
            </div>
          </div>

          {(entryType === "career" || entryType === "project") && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Input
                placeholder="회사명"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
              <Input
                placeholder="직위"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
              <Input
                type="date"
                placeholder="시작일"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
              <Input
                type="date"
                placeholder="종료일"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          )}

          <div>
            <Label>상세 내용 *</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={3}
              placeholder="수행한 업무, 사용 기술, 성과 등"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              STAR 구조 (선택 — 자소서 품질 향상에 도움)
            </p>
            <Textarea
              placeholder="상황(Situation): 어떤 상황이었나요?"
              value={starSituation}
              onChange={(e) => setStarSituation(e.target.value)}
              rows={2}
            />
            <Textarea
              placeholder="과제(Task): 어떤 과제/문제가 있었나요?"
              value={starTask}
              onChange={(e) => setStarTask(e.target.value)}
              rows={2}
            />
            <Textarea
              placeholder="행동(Action): 어떤 행동을 취했나요?"
              value={starAction}
              onChange={(e) => setStarAction(e.target.value)}
              rows={2}
            />
            <Textarea
              placeholder="결과(Result): 어떤 결과를 얻었나요? (정량적 성과 포함)"
              value={starResult}
              onChange={(e) => setStarResult(e.target.value)}
              rows={2}
            />
          </div>

          <div>
            <Label>태그 (쉼표로 구분)</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="예: React, TypeScript, 팀리드"
            />
          </div>

          <Button type="submit" disabled={loading || !title || !content}>
            {loading ? "저장 중..." : "추가"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
