"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EssayTabProps {
  hobbies: string;
  setHobbies: (v: string) => void;
  specialties: string;
  setSpecialties: (v: string) => void;
  roleModel: string;
  setRoleModel: (v: string) => void;
  roleModelReason: string;
  setRoleModelReason: (v: string) => void;
  growthBackground: string;
  setGrowthBackground: (v: string) => void;
  personalValues: string;
  setPersonalValues: (v: string) => void;
  strengthWeakness: string;
  setStrengthWeakness: (v: string) => void;
}

function CharCounter({ value, max }: { value: string; max: number }) {
  const len = value.length;
  const isOver = len > max;
  return (
    <span className={`text-[10px] ${isOver ? "text-destructive font-medium" : "text-muted-foreground"}`}>
      {len}/{max}
    </span>
  );
}

function FieldWithCounter({
  label,
  value,
  onChange,
  max,
  placeholder,
  rows,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  placeholder?: string;
  rows?: number;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <CharCounter value={value} max={max} />
      </div>
      {hint && <p className="text-[11px] text-muted-foreground -mt-0.5">{hint}</p>}
      {rows ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="text-sm"
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="text-sm"
        />
      )}
    </div>
  );
}

export default function EssayTab({
  hobbies,
  setHobbies,
  specialties,
  setSpecialties,
  roleModel,
  setRoleModel,
  roleModelReason,
  setRoleModelReason,
  growthBackground,
  setGrowthBackground,
  personalValues,
  setPersonalValues,
  strengthWeakness,
  setStrengthWeakness,
}: EssayTabProps) {
  return (
    <div className="space-y-5">
      {/* 취미/특기 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">취미/특기</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldWithCounter
            label="취미"
            value={hobbies}
            onChange={setHobbies}
            max={100}
            placeholder="예: 독서, 등산, 요리"
            hint="여가 시간에 즐기는 활동"
          />
          <FieldWithCounter
            label="특기"
            value={specialties}
            onChange={setSpecialties}
            max={100}
            placeholder="예: 프로그래밍, 영상편집, 토론"
            hint="자신 있는 능력이나 기술"
          />
        </CardContent>
      </Card>

      {/* 존경인물 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">존경인물</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldWithCounter
            label="인물"
            value={roleModel}
            onChange={setRoleModel}
            max={50}
            placeholder="예: 이순신, 스티브 잡스"
          />
          <FieldWithCounter
            label="존경이유"
            value={roleModelReason}
            onChange={setRoleModelReason}
            max={300}
            placeholder="이 인물을 존경하는 이유와 나에게 미친 영향을 작성하세요"
            rows={4}
            hint="면접에서 자주 물어보는 질문입니다. 자신의 가치관과 연결하여 작성하세요."
          />
        </CardContent>
      </Card>

      {/* 성장배경 / 가치관 / 장단점 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">자기 소개 에세이</CardTitle>
          <p className="text-[11px] text-muted-foreground mt-1">
            자소서 AI 생성 시 참고 자료로 활용됩니다. 미리 정리해 두면 더 정확한 자소서가 생성됩니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <FieldWithCounter
            label="성장배경"
            value={growthBackground}
            onChange={setGrowthBackground}
            max={500}
            placeholder="가정환경, 성장과정에서 형성된 가치관, 인생의 전환점이 된 경험 등"
            rows={5}
            hint="삼성 Essay 단골 주제: 성장과정에서 영향을 끼친 사건이나 인물"
          />
          <FieldWithCounter
            label="인생관 / 가치관"
            value={personalValues}
            onChange={setPersonalValues}
            max={300}
            placeholder="삶에서 가장 중요하게 생각하는 가치, 좌우명, 일에 대한 철학 등"
            rows={4}
          />
          <FieldWithCounter
            label="강점 / 약점"
            value={strengthWeakness}
            onChange={setStrengthWeakness}
            max={300}
            placeholder="본인의 강점과 약점, 약점을 극복하기 위한 노력 등"
            rows={4}
            hint="약점은 극복 노력과 함께 작성하면 긍정적으로 어필할 수 있습니다."
          />
        </CardContent>
      </Card>
    </div>
  );
}
