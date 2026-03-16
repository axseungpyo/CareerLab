"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProfileFormProps {
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  summary: string;
  setSummary: (v: string) => void;
  careerGoal: string;
  setCareerGoal: (v: string) => void;
  coreValues: string[];
  setCoreValues: (v: string[]) => void;
}

export default function ProfileForm({
  name,
  setName,
  email,
  setEmail,
  phone,
  setPhone,
  summary,
  setSummary,
  careerGoal,
  setCareerGoal,
  coreValues,
  setCoreValues,
}: ProfileFormProps) {
  const [nameBlurred, setNameBlurred] = useState(false);
  const [valueInput, setValueInput] = useState("");

  function handleAddValue(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = valueInput.trim();
      if (val && !coreValues.includes(val)) {
        setCoreValues([...coreValues, val]);
      }
      setValueInput("");
    }
  }

  function handleRemoveValue(val: string) {
    setCoreValues(coreValues.filter((v) => v !== val));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>기본 정보</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Name + Email: 2 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="name">
              이름 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setNameBlurred(true)}
              className={
                nameBlurred && !name.trim()
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              }
              placeholder="홍길동"
            />
            {nameBlurred && !name.trim() && (
              <p className="text-xs text-destructive">이름은 필수 항목입니다.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
            />
          </div>
        </div>

        {/* Phone: half width */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="phone">연락처</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
            />
          </div>
        </div>

        {/* Summary: full width */}
        <div className="space-y-1.5">
          <Label htmlFor="summary">자기소개 요약</Label>
          <Textarea
            id="summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="자신을 한 문단으로 소개하세요"
          />
          <p className="text-xs text-muted-foreground text-right">
            {summary.length}/500
          </p>
        </div>

        {/* Career goal: full width */}
        <div className="space-y-1.5">
          <Label htmlFor="goal">커리어 목표</Label>
          <Input
            id="goal"
            value={careerGoal}
            onChange={(e) => setCareerGoal(e.target.value)}
            placeholder="예: 3년차 프론트엔드 개발자 → 시니어 풀스택"
          />
        </div>

        {/* Core values as tag chips: full width */}
        <div className="space-y-1.5">
          <Label htmlFor="values">핵심 가치</Label>
          <div className="space-y-2">
            {coreValues.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {coreValues.map((val) => (
                  <Badge
                    key={val}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {val}
                    <button
                      type="button"
                      onClick={() => handleRemoveValue(val)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <Input
              id="values"
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
              onKeyDown={handleAddValue}
              placeholder="Enter를 눌러 태그 추가 (예: 성장, 협업)"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
