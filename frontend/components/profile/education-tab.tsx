"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, GraduationCap, School, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DateSelect from "@/components/ui/date-select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Education } from "@/lib/types";

// ── Constants ──

const HS_GRAD = ["졸업예정", "졸업", "수료", "중퇴", "검정고시"];
const HS_TRACKS = ["일반계", "인문계", "자연계", "예체능계", "실업계(상업)", "실업계(공업)", "실업계(농업)", "특성화고", "마이스터고", "자율고", "과학고", "외국어고", "국제고", "예술고", "체육고"];
const UNI_GRAD = ["졸업예정", "졸업", "수료", "중퇴"];
const DEGREES = ["박사", "석사", "학사", "전문학사"];
const DEGREE_TYPES = ["주전공", "부전공", "복수학위", "복수전공"];
const GPA_SCALES = ["4.5", "4.3", "4.0", "100"];
const MAJOR_CATS = [
  "건축", "기계", "디자인", "물리", "법학", "산공", "상경", "생물",
  "섬유/고분자", "수학", "식품", "신방", "어문", "예체능", "의약학",
  "이공기타", "인문기타", "재료/금속", "전기전자(HW)", "전기전자(SW)",
  "전산/컴퓨터", "조선/해양", "토목", "통계(이공)", "통계(인문)",
  "행정", "화학/화공", "환경/안전", "MBA",
];
const UNIVERSITIES = [
  "서울대", "연세대", "고려대", "KAIST", "POSTECH", "성균관대", "한양대",
  "중앙대", "경희대", "한국외대", "서울시립대", "건국대", "동국대", "홍익대",
  "숙명여대", "이화여대", "숭실대", "세종대", "광운대", "명지대", "상명대",
  "아주대", "인하대", "부산대", "경북대", "전남대", "충남대", "충북대",
  "강원대", "전북대", "제주대", "울산대", "한국기술교육대",
];

function emptyHS(): Education {
  return { school: "", major: "", degree: "", level: "high_school", graduation_status: "졸업" };
}
function emptyUni(): Education {
  return { school: "", major: "", degree: "학사", level: "university",
    graduation_status: "졸업예정", degree_type: "주전공", gpa_scale: "4.5" };
}

// ── Reusable select helper ──

function Sel({ value, onChange, options, placeholder = "선택" }: {
  value: string | undefined; onChange: (v: string | undefined) => void;
  options: string[]; placeholder?: string;
}) {
  return (
    <Select value={value || ""} onValueChange={(v) => onChange(v || undefined)}>
      <SelectTrigger className="text-sm"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

// ── Props ──

interface EducationTabProps {
  education: Education[];
  setEducation: (v: Education[]) => void;
  academicNote: string;
  setAcademicNote: (v: string) => void;
}

export default function EducationTab({ education, setEducation, academicNote, setAcademicNote }: EducationTabProps) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [showExtra, setShowExtra] = useState(false);
  const highSchools = education.filter((e) => e.level === "high_school");
  const universities = education.filter((e) => e.level !== "high_school");

  function up(idx: number, patch: Partial<Education>) {
    const next = [...education];
    next[idx] = { ...next[idx], ...patch };
    setEducation(next);
  }
  function addItem(item: Education) {
    setEducation([...education, item]);
    setEditingIdx(education.length);
  }
  function removeItem(idx: number) {
    if (!confirm(`"${education[idx].school || "항목"}"을(를) 삭제하시겠습니까?`)) return;
    setEducation(education.filter((_, i) => i !== idx));
    setEditingIdx(null);
    toast.success("삭제되었습니다.");
  }
  function gIdx(item: Education) { return education.indexOf(item); }

  // ── High School View (summary) ──

  function renderHSView(item: Education, idx: number) {
    return (
      <Card key={idx}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              {item.school || "학교명 미입력"}
              {item.major_category && <Badge variant="outline" className="text-[10px]">{item.major_category}</Badge>}
              {item.graduation_status && (
                <Badge variant="secondary" className="text-[10px]">{item.graduation_status}</Badge>
              )}
            </span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingIdx(idx)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeItem(idx)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {[item.period_start, item.period_end].filter(Boolean).join(" ~ ") || "기간 미입력"}
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── High School Edit ──

  function renderHSEdit(item: Education, idx: number) {
    return (
      <Card key={idx} className="border-primary/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            고등학교 편집
            <Button size="sm" variant="outline" onClick={() => setEditingIdx(null)}>완료</Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">학교명</Label>
              <Input value={item.school} onChange={(e) => up(idx, { school: e.target.value })} placeholder="예: 한국고등학교" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">계열</Label>
              <Sel value={item.major_category} onChange={(v) => up(idx, { major_category: v })} options={HS_TRACKS} placeholder="계열 선택" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">졸업구분</Label>
              <Sel value={item.graduation_status} onChange={(v) => up(idx, { graduation_status: v })} options={HS_GRAD} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">입학</Label>
              <DateSelect value={item.period_start || ""} onChange={(v) => up(idx, { period_start: v })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">졸업</Label>
              <DateSelect value={item.period_end || ""} onChange={(v) => up(idx, { period_end: v })} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeItem(idx)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />삭제
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── University view ──

  function renderUniView(item: Education, idx: number) {
    return (
      <Card key={idx}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              {item.school || "학교명 미입력"}
              {item.degree && <Badge variant="secondary" className="text-[10px]">{item.degree}</Badge>}
              {item.is_transfer && <Badge variant="outline" className="text-[10px]">편입</Badge>}
            </span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingIdx(idx)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeItem(idx)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>{[item.major, item.degree_type, item.major_category].filter(Boolean).join(" / ")}</p>
            {item.double_major && <p>복수전공: {item.double_major}</p>}
            <p>
              {[item.graduation_status, item.gpa && item.gpa_scale ? `${item.gpa}/${item.gpa_scale}` : null].filter(Boolean).join(" · ")}
              {item.period_start || item.period_end ? ` · ${item.period_start || "?"} ~ ${item.period_end || "?"}` : ""}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── University edit (reorganized) ──

  function renderUniEdit(item: Education, idx: number) {
    const hasExtra = item.college || item.double_major || item.country || item.student_id || item.is_transfer;

    return (
      <Card key={idx} className="border-primary/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            학력 편집
            <Button size="sm" variant="outline" onClick={() => { setEditingIdx(null); setShowExtra(false); }}>완료</Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 기본 정보: 학교 + 학위 + 전공 */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">기본 정보</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">학교명</Label>
                <Input value={item.school} onChange={(e) => up(idx, { school: e.target.value })} placeholder="예: 아주대" list="uni-list" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">학위</Label>
                <Sel value={item.degree} onChange={(v) => up(idx, { degree: v || "" })} options={DEGREES} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">졸업구분</Label>
                <Sel value={item.graduation_status} onChange={(v) => up(idx, { graduation_status: v })} options={UNI_GRAD} />
              </div>
            </div>
          </div>

          {/* 전공 + 학점 */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">전공 / 학점</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">전공</Label>
                <Input value={item.major} onChange={(e) => up(idx, { major: e.target.value })} placeholder="예: 소프트웨어학과" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">전공구분</Label>
                <Sel value={item.degree_type} onChange={(v) => up(idx, { degree_type: v })} options={DEGREE_TYPES} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">학점</Label>
                <div className="flex gap-1.5">
                  <Input value={item.gpa || ""} onChange={(e) => up(idx, { gpa: e.target.value })} placeholder="3.8" className="text-sm w-20" />
                  <span className="flex items-center text-xs text-muted-foreground">/</span>
                  <Sel value={item.gpa_scale} onChange={(v) => up(idx, { gpa_scale: v })} options={GPA_SCALES} placeholder="만점" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">전공계열</Label>
                <Sel value={item.major_category} onChange={(v) => up(idx, { major_category: v })} options={MAJOR_CATS} />
              </div>
            </div>
          </div>

          {/* 기간 */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">재학 기간</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">입학</Label>
                <DateSelect value={item.period_start || ""} onChange={(v) => up(idx, { period_start: v })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">졸업</Label>
                <DateSelect value={item.period_end || ""} onChange={(v) => up(idx, { period_end: v })} />
              </div>
            </div>
          </div>

          {/* 추가 정보 (접힘) */}
          <div>
            <button
              type="button"
              onClick={() => setShowExtra((p) => !p)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showExtra || hasExtra ? "rotate-180" : ""}`} />
              추가 정보 (단과대학, 복수전공, 편입 등)
            </button>
            {(showExtra || !!hasExtra) && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">단과대학</Label>
                    <Input value={item.college || ""} onChange={(e) => up(idx, { college: e.target.value })} placeholder="예: 정보통신대학" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">복수전공/부전공</Label>
                    <Input value={item.double_major || ""} onChange={(e) => up(idx, { double_major: e.target.value })} placeholder="예: 경영학과" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">국가</Label>
                    <Input value={item.country || ""} onChange={(e) => up(idx, { country: e.target.value })} placeholder="예: 한국" className="text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">학번</Label>
                    <Input value={item.student_id || ""} onChange={(e) => up(idx, { student_id: e.target.value })} placeholder="예: 20180001" className="text-sm" />
                  </div>
                </div>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input type="checkbox" checked={item.is_transfer || false} onChange={(e) => up(idx, { is_transfer: e.target.checked })} className="rounded" />
                  편입 여부
                </label>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeItem(idx)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />삭제
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Render ──

  return (
    <div className="space-y-6">
      <datalist id="uni-list">
        {UNIVERSITIES.map((u) => <option key={u} value={u} />)}
      </datalist>

      {/* High School */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <School className="h-4 w-4 text-muted-foreground" />고등학교
          </h3>
          {highSchools.length === 0 && (
            <Button size="sm" variant="outline" onClick={() => addItem(emptyHS())}>
              <Plus className="h-3.5 w-3.5 mr-1" />고등학교 추가
            </Button>
          )}
        </div>
        {highSchools.map((item) => {
          const idx = gIdx(item);
          const isComplete = item.school && item.graduation_status;
          return editingIdx === idx || !isComplete
            ? renderHSEdit(item, idx)
            : renderHSView(item, idx);
        })}
      </div>

      <Separator />

      {/* University */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />대학교
          </h3>
          <Button size="sm" variant="outline" onClick={() => addItem(emptyUni())}>
            <Plus className="h-3.5 w-3.5 mr-1" />학력 추가
          </Button>
        </div>
        {universities.length > 0 ? (
          universities.map((item) => {
            const idx = gIdx(item);
            return editingIdx === idx ? renderUniEdit(item, idx) : renderUniView(item, idx);
          })
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">등록된 대학 학력이 없습니다.</p>
        )}
      </div>

      <Separator />

      {/* Academic Note */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">학업 관련 특이사항</Label>
        <Textarea
          value={academicNote}
          onChange={(e) => { if (e.target.value.length <= 100) setAcademicNote(e.target.value); }}
          rows={3}
          placeholder="학업과정 중 직무와 관련된 역량을 개발하는 데 도움이 된 활동이나 경험에 대해 작성"
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground text-right">{academicNote.length}/100</p>
      </div>
    </div>
  );
}
