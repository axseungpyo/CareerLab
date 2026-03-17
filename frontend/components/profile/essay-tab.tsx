"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EssayTabProps {
  hobbies: string;
  setHobbies: (v: string) => void;
  roleModel: string;
  setRoleModel: (v: string) => void;
  roleModelReason: string;
  setRoleModelReason: (v: string) => void;
}

export default function EssayTab({
  hobbies,
  setHobbies,
  roleModel,
  setRoleModel,
  roleModelReason,
  setRoleModelReason,
}: EssayTabProps) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">취미/특기 & 존경인물</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">취미/특기</Label>
            <Input
              value={hobbies}
              onChange={(e) => setHobbies(e.target.value)}
              placeholder="예: 독서, 등산, 프로그래밍"
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">존경인물</Label>
            <Input
              value={roleModel}
              onChange={(e) => setRoleModel(e.target.value)}
              placeholder="예: 이순신, 스티브 잡스"
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">존경이유</Label>
            <Textarea
              value={roleModelReason}
              onChange={(e) => setRoleModelReason(e.target.value)}
              rows={3}
              placeholder="존경하는 이유를 작성해 주세요"
              className="text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">자기소개서 (Essay)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            자기소개서는 기업 분석 결과를 바탕으로 AI가 맞춤 생성합니다.
          </p>
          <Link href="/resume/new">
            <Button className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              자소서 생성하러 가기
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
