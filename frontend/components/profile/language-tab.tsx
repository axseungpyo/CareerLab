"use client";

import { useState } from "react";
import { Plus, Trash2, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { LanguageTest, Certification, Award } from "@/lib/types";
import AddItemDialog, { type FieldConfig } from "./add-item-dialog";

const LANGUAGE_TEST_OPTIONS = [
  { value: "OPIc", label: "OPIc" },
  { value: "TOEIC", label: "TOEIC" },
  { value: "TOEIC-Speaking", label: "TOEIC-Speaking" },
  { value: "TOEFL", label: "TOEFL" },
  { value: "TEPS", label: "TEPS" },
  { value: "JPT", label: "JPT" },
  { value: "JLPT", label: "JLPT" },
  { value: "HSK", label: "HSK" },
  { value: "기타", label: "기타" },
];

const TEST_LOCATION_OPTIONS = [
  { value: "국내", label: "국내" },
  { value: "해외", label: "해외" },
];

interface LanguageTabProps {
  profileId: string | null;
  languageTests: LanguageTest[];
  setLanguageTests: (v: LanguageTest[]) => void;
  certifications: Certification[];
  setCertifications: (v: Certification[]) => void;
  awards: Award[];
  setAwards: (v: Award[]) => void;
}

async function handleDeleteItem<T extends { id: string }>(
  apiPath: string,
  id: string,
  name: string,
  items: T[],
  setItems: (v: T[]) => void,
) {
  if (!confirm(`"${name}"을(를) 삭제하시겠습니까?`)) return;
  try {
    await api.delete(`${apiPath}/${id}`);
    setItems(items.filter((item) => item.id !== id));
    toast.success("삭제되었습니다.");
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "삭제에 실패했습니다.");
  }
}

const PRIMARY_TEST_OPTIONS = [
  { value: "OPIc", label: "OPIc" },
  { value: "TOEIC-Speaking", label: "TOEIC-Speaking" },
];

const OPIC_LEVELS = [
  { value: "NH", label: "NH (Novice High)" },
  { value: "IL", label: "IL (Intermediate Low)" },
  { value: "IM1", label: "IM1 (Intermediate Mid 1)" },
  { value: "IM2", label: "IM2 (Intermediate Mid 2)" },
  { value: "IM3", label: "IM3 (Intermediate Mid 3)" },
  { value: "IH", label: "IH (Intermediate High)" },
  { value: "AL", label: "AL (Advanced Low)" },
  { value: "AM", label: "AM (Advanced Mid)" },
  { value: "AH", label: "AH (Advanced High)" },
];

const TOEIC_SPEAKING_LEVELS = [
  { value: "Level 1", label: "Level 1 (0~30)" },
  { value: "Level 2", label: "Level 2 (40~50)" },
  { value: "Level 3", label: "Level 3 (60~70)" },
  { value: "Level 4", label: "Level 4 (80~100)" },
  { value: "Level 5", label: "Level 5 (110~120)" },
  { value: "Level 6", label: "Level 6 (130~150)" },
  { value: "Level 7", label: "Level 7 (160~180)" },
  { value: "Level 8", label: "Level 8 (190~200)" },
];

export default function LanguageTab({
  profileId,
  languageTests,
  setLanguageTests,
  certifications,
  setCertifications,
  awards,
  setAwards,
}: LanguageTabProps) {
  const [primaryDialogOpen, setPrimaryDialogOpen] = useState(false);
  const [langDialogOpen, setLangDialogOpen] = useState(false);
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [awardDialogOpen, setAwardDialogOpen] = useState(false);

  if (!profileId) {
    return <p className="text-sm text-muted-foreground text-center py-8">프로필을 먼저 저장한 후 외국어/자격 정보를 추가할 수 있습니다.</p>;
  }

  const primaryTests = languageTests.filter((t) => t.is_primary);
  const otherTests = languageTests.filter((t) => !t.is_primary);

  const primaryFields: FieldConfig[] = [
    { name: "test_name", label: "시험종류", type: "select", required: true, options: PRIMARY_TEST_OPTIONS },
    { name: "level", label: "등급", type: "select", required: true, options: OPIC_LEVELS, placeholder: "등급 선택" },
    { name: "score", label: "점수", type: "text", placeholder: "TOEIC-Speaking: 점수 입력 (예: 160)" },
    { name: "test_date", label: "응시일자", type: "date", required: true },
    { name: "test_location", label: "응시장소", type: "select", options: TEST_LOCATION_OPTIONS, defaultValue: "국내" },
    { name: "cert_number", label: "자격번호", type: "text", required: true, placeholder: "성적표 자격번호" },
  ];

  const langFields: FieldConfig[] = [
    { name: "test_name", label: "시험명", type: "select", required: true, options: LANGUAGE_TEST_OPTIONS },
    { name: "language", label: "언어", type: "text", defaultValue: "영어", placeholder: "영어" },
    { name: "score", label: "점수", type: "text", placeholder: "예: 850, AL" },
    { name: "level", label: "등급", type: "text", placeholder: "예: IH, Level 6" },
    { name: "test_date", label: "응시일자", type: "date" },
    { name: "test_location", label: "응시장소", type: "select", options: TEST_LOCATION_OPTIONS, defaultValue: "국내" },
    { name: "cert_number", label: "자격번호", type: "text", placeholder: "성적표 자격번호" },
  ];

  const certFields: FieldConfig[] = [
    { name: "cert_name", label: "자격종류", type: "text", required: true, placeholder: "예: ADsP, 정보처리기사" },
    { name: "cert_level", label: "등급", type: "text", placeholder: "예: 1급, 등급없음" },
    { name: "acquired_date", label: "취득일자", type: "date" },
    { name: "cert_number", label: "자격번호", type: "text", placeholder: "자격번호 입력" },
    { name: "issuer", label: "발급기관", type: "text", placeholder: "예: 한국데이터진흥원" },
  ];

  const awardFields: FieldConfig[] = [
    { name: "title", label: "수상내용", type: "text", required: true, placeholder: "예: 해커톤 대상" },
    { name: "organization", label: "시상단체", type: "text", placeholder: "예: 과학기술정보통신부" },
    { name: "award_date", label: "수상일자", type: "date" },
    { name: "description", label: "수상내용 상세설명", type: "text", placeholder: "상세 내용" },
  ];

  function renderTestCard(test: LanguageTest) {
    return (
      <div key={test.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
        <div>
          <p className="font-medium text-sm">
            {test.test_name}
            <Badge variant="secondary" className="text-[10px] ml-1.5">{test.language}</Badge>
            {test.is_primary && <Badge className="text-[10px] ml-1.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400">필수</Badge>}
          </p>
          <p className="text-xs text-muted-foreground">
            {[test.score, test.level].filter(Boolean).join(" / ") || "-"}
            {test.test_date ? ` · ${test.test_date}` : ""}
            {test.test_location ? ` · ${test.test_location}` : ""}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => handleDeleteItem("/api/profile/languages/item", test.id, test.test_name, languageTests, setLanguageTests)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 영어회화 필수자격 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-500" />
              영어회화 필수자격
            </span>
            <Button size="sm" variant="outline" onClick={() => setPrimaryDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />등록
            </Button>
          </CardTitle>
          <p className="text-[11px] text-muted-foreground mt-1">
            삼성 지원 시 OPIc 또는 TOEIC-Speaking 중 1개 필수 제출
          </p>
        </CardHeader>
        <CardContent>
          {primaryTests.length > 0 ? (
            <div className="space-y-2">{primaryTests.map(renderTestCard)}</div>
          ) : (
            <div className="text-center py-4">
              <p className="text-xs text-muted-foreground">등록된 필수 어학 자격이 없습니다.</p>
              <p className="text-[11px] text-muted-foreground mt-1">OPIc IM2 이상 또는 TOEIC-Speaking Level 6 이상 권장</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 기타 외국어 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            기타 외국어
            <Button size="sm" variant="outline" onClick={() => setLangDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />추가
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {otherTests.length > 0 ? (
            <div className="space-y-2">{otherTests.map(renderTestCard)}</div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-3">등록된 어학 시험이 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {/* 자격증/면허 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            자격증/면허
            <Button size="sm" variant="outline" onClick={() => setCertDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />추가
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {certifications.length > 0 ? (
            <div className="space-y-2">
              {certifications.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium text-sm">{c.cert_name}{c.cert_level ? ` (${c.cert_level})` : ""}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.issuer || ""}{c.acquired_date ? ` · ${c.acquired_date}` : ""}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteItem("/api/profile/certifications/item", c.id, c.cert_name, certifications, setCertifications)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-3">등록된 자격증이 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {/* 수상경력 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            수상경력
            <Button size="sm" variant="outline" onClick={() => setAwardDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />추가
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {awards.length > 0 ? (
            <div className="space-y-2">
              {awards.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium text-sm">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.organization || ""}{a.award_date ? ` · ${a.award_date}` : ""}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteItem("/api/profile/awards/item", a.id, a.title, awards, setAwards)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-3">등록된 수상경력이 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddItemDialog open={primaryDialogOpen} onOpenChange={setPrimaryDialogOpen}
        title="영어회화 필수자격 등록"
        description="삼성 지원 시 필수 제출 자격입니다. OPIc 또는 TOEIC-Speaking을 선택하세요."
        fields={primaryFields}
        onSubmit={async (data) => {
          const result = await api.post<LanguageTest>("/api/profile/languages", {
            profile_id: profileId, ...data, language: "영어", is_primary: true,
          });
          setLanguageTests([result, ...languageTests]);
          toast.success("필수자격이 등록되었습니다.");
        }} />

      <AddItemDialog open={langDialogOpen} onOpenChange={setLangDialogOpen} title="어학시험 추가" fields={langFields}
        onSubmit={async (data) => {
          const result = await api.post<LanguageTest>("/api/profile/languages", { profile_id: profileId, ...data });
          setLanguageTests([result, ...languageTests]);
          toast.success("추가되었습니다.");
        }} />

      <AddItemDialog open={certDialogOpen} onOpenChange={setCertDialogOpen} title="자격증 추가" fields={certFields}
        onSubmit={async (data) => {
          const result = await api.post<Certification>("/api/profile/certifications", { profile_id: profileId, ...data });
          setCertifications([result, ...certifications]);
          toast.success("추가되었습니다.");
        }} />

      <AddItemDialog open={awardDialogOpen} onOpenChange={setAwardDialogOpen} title="수상경력 추가" fields={awardFields}
        onSubmit={async (data) => {
          const result = await api.post<Award>("/api/profile/awards", { profile_id: profileId, ...data });
          setAwards([result, ...awards]);
          toast.success("추가되었습니다.");
        }} />
    </div>
  );
}
