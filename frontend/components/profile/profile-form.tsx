"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile, Education } from "@/lib/types";

interface ProfileFormProps {
  profile?: Profile | null;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}

export default function ProfileForm({ profile, onSubmit }: ProfileFormProps) {
  const [name, setName] = useState(profile?.name || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [summary, setSummary] = useState(profile?.summary || "");
  const [careerGoal, setCareerGoal] = useState(profile?.career_goal || "");
  const [coreValues, setCoreValues] = useState(
    profile?.core_values?.join(", ") || ""
  );
  const [education, setEducation] = useState<Education[]>(
    profile?.education || [{ school: "", major: "", degree: "", period: "" }]
  );
  const [loading, setLoading] = useState(false);

  function handleEducationChange(
    index: number,
    field: keyof Education,
    value: string
  ) {
    const updated = [...education];
    updated[index] = { ...updated[index], [field]: value };
    setEducation(updated);
  }

  function addEducation() {
    setEducation([...education, { school: "", major: "", degree: "", period: "" }]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        name,
        email: email || undefined,
        phone: phone || undefined,
        summary: summary || undefined,
        career_goal: careerGoal || undefined,
        core_values: coreValues
          ? coreValues.split(",").map((v) => v.trim())
          : undefined,
        education: education.filter((e) => e.school),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">이름 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="phone">연락처</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="summary">자기소개 요약</Label>
            <Textarea
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              placeholder="자신을 한 문단으로 소개하세요"
            />
          </div>

          <div>
            <Label htmlFor="goal">커리어 목표</Label>
            <Input
              id="goal"
              value={careerGoal}
              onChange={(e) => setCareerGoal(e.target.value)}
              placeholder="예: 백엔드 시니어 개발자"
            />
          </div>

          <div>
            <Label htmlFor="values">핵심 가치 (쉼표로 구분)</Label>
            <Input
              id="values"
              value={coreValues}
              onChange={(e) => setCoreValues(e.target.value)}
              placeholder="예: 성장, 협업, 문제해결"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            학력
            <Button type="button" variant="outline" size="sm" onClick={addEducation}>
              + 추가
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {education.map((edu, i) => (
            <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Input
                placeholder="학교"
                value={edu.school}
                onChange={(e) => handleEducationChange(i, "school", e.target.value)}
              />
              <Input
                placeholder="전공"
                value={edu.major}
                onChange={(e) => handleEducationChange(i, "major", e.target.value)}
              />
              <Input
                placeholder="학위"
                value={edu.degree}
                onChange={(e) => handleEducationChange(i, "degree", e.target.value)}
              />
              <Input
                placeholder="기간"
                value={edu.period}
                onChange={(e) => handleEducationChange(i, "period", e.target.value)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button type="submit" disabled={loading || !name} className="w-full">
        {loading ? "저장 중..." : profile ? "프로필 수정" : "프로필 생성"}
      </Button>
    </form>
  );
}
