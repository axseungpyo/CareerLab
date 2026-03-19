"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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
import type { CareerEntry } from "@/lib/types";
import DateSelect from "@/components/ui/date-select";

interface CareerEntryFormProps {
  profileId: string;
  editEntry?: CareerEntry | null;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

export default function CareerEntryForm({
  profileId,
  editEntry,
  onSubmit,
  onCancel,
}: CareerEntryFormProps) {
  const [entryType, setEntryType] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);
  const [activityCategory, setActivityCategory] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [starSituation, setStarSituation] = useState("");
  const [starTask, setStarTask] = useState("");
  const [starAction, setStarAction] = useState("");
  const [starResult, setStarResult] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [starOpen, setStarOpen] = useState(false);

  const isEdit = !!editEntry;

  // Pre-fill when editEntry changes
  useEffect(() => {
    if (editEntry) {
      setEntryType(editEntry.entry_type);
      setTitle(editEntry.title);
      setContent(editEntry.content);
      setCompany(editEntry.company || "");
      setPosition(editEntry.position || "");
      setDepartment(editEntry.department || "");
      setLocation(editEntry.location || "");
      setEmploymentType(editEntry.employment_type || "");
      setIsCurrent(editEntry.is_current || false);
      setActivityCategory(editEntry.activity_category || "");
      setPeriodStart(editEntry.period_start || "");
      setPeriodEnd(editEntry.period_end || "");
      setStarSituation(editEntry.star_situation || "");
      setStarTask(editEntry.star_task || "");
      setStarAction(editEntry.star_action || "");
      setStarResult(editEntry.star_result || "");
      setTags(editEntry.tags?.join(", ") || "");
      // Expand STAR if any field has content
      if (
        editEntry.star_situation ||
        editEntry.star_task ||
        editEntry.star_action ||
        editEntry.star_result
      ) {
        setStarOpen(true);
      }
    }
  }, [editEntry]);

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
        department: department || undefined,
        location: location || undefined,
        employment_type: employmentType || undefined,
        is_current: isCurrent || undefined,
        activity_category: activityCategory || undefined,
        period_start: periodStart || undefined,
        period_end: isCurrent ? undefined : (periodEnd || undefined),
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
          {isEdit ? "경력 수정" : "경력/프로젝트 추가"}
          <Button variant="ghost" size="sm" onClick={onCancel}>
            취소
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>유형</Label>
              <Select
                value={entryType}
                onValueChange={(v) => v && setEntryType(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="career">경력</SelectItem>
                  <SelectItem value="project">프로젝트</SelectItem>
                  <SelectItem value="skill">역량</SelectItem>
                  <SelectItem value="story">경험 스토리</SelectItem>
                  <SelectItem value="activity">대내외활동</SelectItem>
                  <SelectItem value="training">연수</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
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
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">회사명</Label>
                  <Input
                    placeholder="예: 삼성전자"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">직위</Label>
                  <Input
                    placeholder="예: 사원"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">부서명</Label>
                  <Input
                    placeholder="예: 개발팀"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">소재지</Label>
                  <Input
                    placeholder="예: 서울"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">근무형태</Label>
                  <Select value={employmentType} onValueChange={(v) => setEmploymentType(v || "")}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="정규직">정규직</SelectItem>
                      <SelectItem value="계약직">계약직</SelectItem>
                      <SelectItem value="인턴">인턴</SelectItem>
                      <SelectItem value="파트타임">파트타임</SelectItem>
                      <SelectItem value="프리랜서">프리랜서</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">시작일</Label>
                  <DateSelect value={periodStart} onChange={setPeriodStart} placeholder="시작" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">종료일</Label>
                  <DateSelect value={periodEnd} onChange={setPeriodEnd} placeholder={isCurrent ? "현재" : "종료"} />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCurrent}
                      onChange={(e) => setIsCurrent(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    현재 근무 중
                  </label>
                </div>
              </div>
            </>
          )}

          {(entryType === "activity" || entryType === "training") && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">기관/단체명</Label>
                  <Input
                    placeholder="예: 대한적십자사"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">역할/직위</Label>
                  <Input
                    placeholder="예: 팀장"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">활동구분</Label>
                  <Select value={activityCategory} onValueChange={(v) => setActivityCategory(v || "")}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="온라인활동">온라인활동</SelectItem>
                      <SelectItem value="교외활동">교외활동</SelectItem>
                      <SelectItem value="국내연수">국내연수</SelectItem>
                      <SelectItem value="교내활동">교내활동</SelectItem>
                      <SelectItem value="기타">기타</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">시작일</Label>
                  <DateSelect value={periodStart} onChange={setPeriodStart} placeholder="시작" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">종료일</Label>
                  <DateSelect value={periodEnd} onChange={setPeriodEnd} placeholder="종료" />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label>상세 내용 *</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={3}
              placeholder="수행한 업무, 사용 기술, 성과 등"
            />
          </div>

          {/* Collapsible STAR section */}
          <div className="space-y-2">
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setStarOpen(!starOpen)}
            >
              STAR 구조 작성 (선택)
              {starOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {starOpen && (
              <div className="space-y-2">
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
            )}
          </div>

          <div className="space-y-1.5">
            <Label>태그 (쉼표로 구분)</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="예: React, TypeScript, 팀리드"
            />
          </div>

          <Button type="submit" disabled={loading || !entryType || !title || !content}>
            {loading ? "저장 중..." : isEdit ? "수정" : "추가"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
