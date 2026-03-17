"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import type { CareerEntry } from "@/lib/types";
import CareerEntryForm from "./career-entry-form";

const ENTRY_TYPE_LABELS: Record<string, string> = {
  career: "경력",
  project: "프로젝트",
  skill: "역량",
  story: "경험",
  activity: "대내외활동",
  training: "연수",
};

interface CareerTabProps {
  profileId: string | null;
  entries: CareerEntry[];
  setEntries: (v: CareerEntry[]) => void;
}

export default function CareerTab({ profileId, entries, setEntries }: CareerTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CareerEntry | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!profileId) {
    return <p className="text-sm text-muted-foreground text-center py-8">프로필을 먼저 저장한 후 경력을 추가할 수 있습니다.</p>;
  }

  const careerEntries = entries.filter((e) => ["career", "project", "skill", "story"].includes(e.entry_type));
  const activityEntries = entries.filter((e) => ["activity", "training"].includes(e.entry_type));

  async function handleSubmit(data: Record<string, unknown>) {
    try {
      if (editingEntry) {
        await api.put<CareerEntry>(`/api/profile/entries/${editingEntry.id}`, data);
        toast.success("경력이 수정되었습니다.");
      } else {
        await api.post<CareerEntry>("/api/profile/entries", data);
        toast.success("경력이 추가되었습니다.");
      }
      setShowForm(false);
      setEditingEntry(null);
      // Reload entries
      const e = await api.get<CareerEntry[]>(`/api/profile/entries/${profileId}`);
      setEntries(e);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장에 실패했습니다.");
    }
  }

  async function handleDelete(entry: CareerEntry) {
    if (!confirm(`"${entry.title}"을(를) 삭제하시겠습니까?`)) return;
    try {
      await api.delete(`/api/profile/entries/${entry.id}`);
      setEntries(entries.filter((e) => e.id !== entry.id));
      toast.success("삭제되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    }
  }

  function renderEntryCard(entry: CareerEntry) {
    const expanded = expandedId === entry.id;
    return (
      <Card key={entry.id}>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {ENTRY_TYPE_LABELS[entry.entry_type] || entry.entry_type}
                </Badge>
                {entry.employment_type && (
                  <Badge variant="secondary" className="text-[10px]">{entry.employment_type}</Badge>
                )}
                {entry.is_current && (
                  <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">재직중</Badge>
                )}
              </div>
              <p className="font-medium text-sm">{entry.title}</p>
              <p className="text-xs text-muted-foreground">
                {[entry.company, entry.position, entry.department].filter(Boolean).join(" · ")}
                {entry.location ? ` (${entry.location})` : ""}
              </p>
              {entry.period_start && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {entry.period_start} ~ {entry.period_end || "현재"}
                </p>
              )}
              {entry.activity_category && (
                <Badge variant="secondary" className="text-[10px] mt-1">{entry.activity_category}</Badge>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpandedId(expanded ? null : entry.id)}>
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingEntry(entry); setShowForm(true); }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(entry)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {expanded && (
            <div className="mt-3 pt-3 border-t text-sm space-y-2">
              <p className="whitespace-pre-wrap text-muted-foreground">{entry.content}</p>
              {entry.star_situation && (
                <div className="bg-muted/30 rounded-lg p-3 space-y-1.5 text-xs">
                  {entry.star_situation && <p><span className="font-medium">상황:</span> {entry.star_situation}</p>}
                  {entry.star_task && <p><span className="font-medium">과제:</span> {entry.star_task}</p>}
                  {entry.star_action && <p><span className="font-medium">행동:</span> {entry.star_action}</p>}
                  {entry.star_result && <p><span className="font-medium">결과:</span> {entry.star_result}</p>}
                </div>
              )}
              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {entry.tags.map((t, i) => <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>)}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      {showForm ? (
        <CareerEntryForm
          profileId={profileId}
          editEntry={editingEntry}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditingEntry(null); }}
        />
      ) : (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">경력사항</h2>
          <Button size="sm" onClick={() => { setEditingEntry(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-1" />추가
          </Button>
        </div>
      )}

      {/* 직무 관련 경력 */}
      {!showForm && (
        <>
          {careerEntries.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">직무 관련 경력</h3>
              {careerEntries.map(renderEntryCard)}
            </div>
          )}

          {activityEntries.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">대내외 활동</h3>
                {activityEntries.map(renderEntryCard)}
              </div>
            </>
          )}

          {entries.length === 0 && (
            <p className="text-center text-muted-foreground py-8">등록된 경력이 없습니다. 추가 버튼을 눌러 경력을 입력하세요.</p>
          )}
        </>
      )}
    </div>
  );
}
