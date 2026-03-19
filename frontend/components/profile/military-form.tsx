"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MilitaryService } from "@/lib/types";

// Samsung 실측 옵션
const MILITARY_STATUS = [
  { value: "completed", label: "복무완료(병역필)/복무중(완료예정)" },
  { value: "not_served", label: "미필" },
  { value: "not_applicable", label: "비대상" },
  { value: "exempted", label: "면제" },
];

const DISCHARGE_TYPE = [
  "만기제대", "공익근무소집해제", "군복무중", "명예제대", "방위소집해제",
  "예편", "의가사제대", "의병제대", "소집해제", "상이제대",
  "부선망제대", "불명예제대", "특례보충역", "특례복무중", "제대기타",
];

const BRANCH = ["육군", "해군", "공군", "해병", "전경", "의경", "국제협력단", "의무소방"];

const RANK = [
  "계급없음", "이병", "일병", "상병", "병장",
  "하사", "중사", "상사", "원사", "준위",
  "소위", "중위", "대위", "소령", "중령", "대령",
];

interface MilitaryFormProps {
  value: MilitaryService;
  onChange: (v: MilitaryService) => void;
}

export default function MilitaryForm({ value, onChange }: MilitaryFormProps) {
  function update(patch: Partial<MilitaryService>) {
    onChange({ ...value, ...patch });
  }

  const showDetails = value.status === "completed";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">병역사항</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">병역사항</Label>
          <Select value={value.status || ""} onValueChange={(v) => update({ status: v || undefined })}>
            <SelectTrigger className="text-sm"><SelectValue placeholder="선택" /></SelectTrigger>
            <SelectContent>
              {MILITARY_STATUS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showDetails && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">병역구분</Label>
                <Select value={value.discharge_type || ""} onValueChange={(v) => update({ discharge_type: v || undefined })}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent>
                    {DISCHARGE_TYPE.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">군별</Label>
                <Select value={value.branch || ""} onValueChange={(v) => update({ branch: v || undefined })}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent>
                    {BRANCH.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">계급</Label>
                <Select value={value.rank || ""} onValueChange={(v) => update({ rank: v || undefined })}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent>
                    {RANK.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">복무 시작</Label>
                <Input
                  type="month"
                  value={value.period_start || ""}
                  onChange={(e) => update({ period_start: e.target.value || undefined })}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">복무 종료</Label>
                <Input
                  type="month"
                  value={value.period_end || ""}
                  onChange={(e) => update({ period_end: e.target.value || undefined })}
                  className="text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">주요활동사항</Label>
              <div className="relative">
                <Input
                  value={value.note || ""}
                  onChange={(e) => update({ note: e.target.value.slice(0, 100) })}
                  placeholder="복무 중 특기사항 (선택)"
                  maxLength={100}
                  className="text-sm pr-14"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                  {(value.note || "").length}/100
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
