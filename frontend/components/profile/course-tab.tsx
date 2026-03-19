"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { Course, Education } from "@/lib/types";
import AddItemDialog, { type FieldConfig } from "./add-item-dialog";

const CATEGORY_OPTIONS = [
  { value: "major_required", label: "전공필수" },
  { value: "major_elective", label: "전공선택" },
  { value: "general", label: "교양" },
  { value: "other", label: "일반" },
];

const SEMESTER_OPTIONS = [
  { value: "1", label: "1학기" },
  { value: "2", label: "2학기" },
  { value: "summer", label: "하계" },
  { value: "winter", label: "동계" },
];

interface CourseTabProps {
  profileId: string | null;
  courses: Course[];
  setCourses: (v: Course[]) => void;
  education: Education[];
}

export default function CourseTab({ profileId, courses, setCourses, education }: CourseTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!profileId) {
    return <p className="text-sm text-muted-foreground text-center py-8">프로필을 먼저 저장한 후 교과목을 추가할 수 있습니다.</p>;
  }

  const schoolName = education.find((e) => e.level !== "high_school")?.school || education[0]?.school || "";

  const fields: FieldConfig[] = [
    { name: "school_name", label: "학교명", type: "text", required: true, defaultValue: schoolName, placeholder: "예: 아주대" },
    { name: "course_name", label: "과목명", type: "text", required: true, placeholder: "예: 자료구조" },
    { name: "category", label: "구분", type: "select", required: true, options: CATEGORY_OPTIONS },
    { name: "credits", label: "학점", type: "number", placeholder: "3" },
    { name: "year", label: "이수년도", type: "number", placeholder: "2024" },
    { name: "semester", label: "학기", type: "select", options: SEMESTER_OPTIONS },
  ];

  async function handleAdd(data: Record<string, unknown>) {
    const result = await api.post<Course>("/api/profile/courses", {
      profile_id: profileId,
      ...data,
      credits: data.credits ? Number(data.credits) : undefined,
      year: data.year ? Number(data.year) : undefined,
    });
    setCourses([result, ...courses]);
    toast.success("교과목이 추가되었습니다.");
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}"을(를) 삭제하시겠습니까?`)) return;
    try {
      await api.delete(`/api/profile/courses/item/${id}`);
      setCourses(courses.filter((c) => c.id !== id));
      toast.success("삭제되었습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">이수교과목</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />교과목 추가
        </Button>
      </div>

      {/* Summary */}
      {courses.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CATEGORY_OPTIONS.map((cat) => {
            const total = courses.filter((c) => c.category === cat.value).reduce((s, c) => s + (c.credits || 0), 0);
            return (
              <Card key={cat.value} className="text-center py-3">
                <p className="text-xs text-muted-foreground">{cat.label}</p>
                <p className="text-lg font-bold">{total}<span className="text-xs font-normal text-muted-foreground ml-0.5">학점</span></p>
              </Card>
            );
          })}
        </div>
      )}

      {/* Table */}
      {courses.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-2 px-2 text-left">과목명</th>
                <th className="py-2 px-2 text-left">구분</th>
                <th className="py-2 px-2 text-center">학점</th>
                <th className="py-2 px-2 text-center">학기</th>
                <th className="py-2 px-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-2 font-medium">{c.course_name}</td>
                  <td className="py-2 px-2">
                    <Badge variant="outline" className="text-[10px]">
                      {CATEGORY_OPTIONS.find((o) => o.value === c.category)?.label || c.category}
                    </Badge>
                  </td>
                  <td className="py-2 px-2 text-center">{c.credits || "-"}</td>
                  <td className="py-2 px-2 text-center text-muted-foreground">
                    {c.year && c.semester ? `${c.year}-${SEMESTER_OPTIONS.find((s) => s.value === c.semester)?.label || c.semester}` : "-"}
                  </td>
                  <td className="py-2 px-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(c.id, c.course_name)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-8">등록된 교과목이 없습니다.</p>
      )}

      <AddItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="교과목 추가"
        description="이수한 교과목 정보를 입력하세요."
        fields={fields}
        onSubmit={handleAdd}
      />
    </div>
  );
}
