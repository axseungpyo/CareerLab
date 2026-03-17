"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BasicInfoExtendedProps {
  nameEn: string;
  setNameEn: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  phoneSecondary: string;
  setPhoneSecondary: (v: string) => void;
}

export default function BasicInfoExtended({
  nameEn,
  setNameEn,
  address,
  setAddress,
  phoneSecondary,
  setPhoneSecondary,
}: BasicInfoExtendedProps) {
  const parts = nameEn.split(" ");
  const lastName = parts[0] || "";
  const firstName = parts.slice(1).join(" ") || "";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">추가 인적사항</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">영문 성 (Last Name)</Label>
            <Input
              value={lastName}
              onChange={(e) => setNameEn(`${e.target.value} ${firstName}`.trim())}
              placeholder="Hong"
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">영문 이름 (First Name)</Label>
            <Input
              value={firstName}
              onChange={(e) => setNameEn(`${lastName} ${e.target.value}`.trim())}
              placeholder="Seungpyo"
              className="text-sm"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">주소</Label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="서울특별시 강남구..."
            className="text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">보조 연락처</Label>
          <Input
            value={phoneSecondary}
            onChange={(e) => setPhoneSecondary(e.target.value)}
            placeholder="010-0000-0000"
            className="text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}
