"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Search,
  ExternalLink,
  FileText,
  Plus,
  Pencil,
  Trash2,
  X,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ProfileForm from "@/components/profile/profile-form";
import CareerEntryForm from "@/components/profile/career-entry-form";
import FileUpload from "@/components/profile/file-upload";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { Textarea } from "@/components/ui/textarea";
import type { Profile, CareerEntry, Education, Course, LanguageTest, Certification, Award, MilitaryService } from "@/lib/types";

type TabId = "basic" | "education" | "courses" | "career" | "languages" | "essay" | "import";

interface NotionPage {
  id: string;
  title: string;
  url: string;
  icon: string | null;
  last_edited: string;
}

interface SettingsLlm {
  notion: { enabled: boolean; has_key?: boolean };
}

interface ParsedData {
  profile?: Record<string, unknown>;
  career_entries?: Record<string, unknown>[];
}

const TABS: { id: TabId; label: string }[] = [
  { id: "basic", label: "기본정보" },
  { id: "education", label: "학력" },
  { id: "courses", label: "이수교과목" },
  { id: "career", label: "경력" },
  { id: "languages", label: "외국어·자격" },
  { id: "essay", label: "Essay" },
  { id: "import", label: "가져오기" },
];

const GRADUATION_STATUS_OPTIONS = ["졸업", "재학", "휴학", "졸업예정", "중퇴", "수료"];
const MAJOR_CATEGORY_OPTIONS = ["이공", "인문", "상경", "법학", "사회", "예체능", "의약", "교육", "이공기타", "인문기타"];
const GPA_SCALE_OPTIONS = ["4.5", "4.3", "4.0", "100"];
const DEGREE_TYPE_OPTIONS = ["주전공", "복수전공", "부전공"];
const COURSE_CATEGORY_OPTIONS = [
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
const LANGUAGE_TEST_OPTIONS = ["OPIc", "TOEIC", "TOEIC-Speaking", "TOEFL", "TEPS", "JPT", "HSK", "JLPT", "기타"];
const MILITARY_STATUS_OPTIONS = [
  { value: "completed", label: "복무완료" },
  { value: "in_service", label: "복무중" },
  { value: "exempted", label: "면제" },
  { value: "not_applicable", label: "해당없음" },
];
const BRANCH_OPTIONS = ["육군", "해군", "공군", "해병대", "의경", "기타"];

const DEGREE_OPTIONS = ["학사", "석사", "박사", "전문학사", "기타"];

const SCHOOL_SUGGESTIONS = [
  "서울대학교", "연세대학교", "고려대학교", "성균관대학교", "한양대학교",
  "중앙대학교", "경희대학교", "한국외국어대학교", "서강대학교", "이화여자대학교",
  "건국대학교", "동국대학교", "홍익대학교", "숙명여자대학교", "세종대학교",
  "광운대학교", "명지대학교", "상명대학교", "국민대학교", "숭실대학교",
  "부산대학교", "경북대학교", "전남대학교", "충남대학교", "충북대학교",
  "KAIST", "POSTECH", "GIST", "UNIST", "DGIST",
];

const MAJOR_SUGGESTIONS = [
  "컴퓨터공학", "소프트웨어공학", "정보통신공학", "전자공학", "전기공학",
  "기계공학", "산업공학", "화학공학", "경영학", "경제학",
  "통계학", "수학", "물리학", "화학", "생명과학",
  "심리학", "사회학", "영어영문학", "국어국문학", "법학",
  "디자인", "건축학", "의학", "약학", "간호학",
  "데이터사이언스", "인공지능", "사이버보안", "미디어커뮤니케이션",
];

function computeCompletion(
  name: string,
  email: string,
  education: Education[],
  summary: string,
  careerGoal: string
): number {
  let filled = 0;
  if (name.trim()) filled++;
  if (email.trim()) filled++;
  if (education.length > 0 && education.some((e) => e.school.trim())) filled++;
  if (summary.trim()) filled++;
  if (careerGoal.trim()) filled++;
  return Math.round((filled / 5) * 100);
}

export default function ProfilePage() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("basic");

  // Profile fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [summary, setSummary] = useState("");
  const [careerGoal, setCareerGoal] = useState("");
  const [coreValues, setCoreValues] = useState<string[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  // Samsung-style extended fields
  const [nameEn, setNameEn] = useState("");
  const [address, setAddress] = useState("");
  const [phoneSecondary, setPhoneSecondary] = useState("");
  const [militaryService, setMilitaryService] = useState<MilitaryService>({});
  const [hobbies, setHobbies] = useState("");
  const [roleModel, setRoleModel] = useState("");
  const [roleModelReason, setRoleModelReason] = useState("");
  const [academicNote, setAcademicNote] = useState("");
  // New tab data
  const [courses, setCourses] = useState<Course[]>([]);
  const [languageTests, setLanguageTests] = useState<LanguageTest[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);

  // Career entries
  const [entries, setEntries] = useState<CareerEntry[]>([]);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CareerEntry | null>(null);

  // Education editing
  const [editingEduIndex, setEditingEduIndex] = useState<number | null>(null);
  const [eduDraft, setEduDraft] = useState<Education>({
    school: "",
    major: "",
    degree: "",
    period: "",
  });
  const [addingEdu, setAddingEdu] = useState(false);

  // Parse preview
  const [parsedPreview, setParsedPreview] = useState<ParsedData | null>(null);

  // Notion state
  const [notionEnabled, setNotionEnabled] = useState(false);
  const [notionQuery, setNotionQuery] = useState("");
  const [notionPages, setNotionPages] = useState<NotionPage[]>([]);
  const [notionSearching, setNotionSearching] = useState(false);
  const [notionImporting, setNotionImporting] = useState(false);
  const [selectedNotionPage, setSelectedNotionPage] = useState<string | null>(
    null
  );

  useEffect(() => {
    loadProfile();
    checkNotionStatus();
  }, []);

  async function loadProfile() {
    try {
      const p = await api.get<Profile | null>("/api/profile");
      if (p) {
        setProfileId(p.id);
        setName(p.name || "");
        setEmail(p.email || "");
        setPhone(p.phone || "");
        setSummary(p.summary || "");
        setCareerGoal(p.career_goal || "");
        setCoreValues(p.core_values || []);
        setEducation(p.education || []);
        // Samsung-style extended fields
        setNameEn(p.name_en || "");
        setAddress(p.address || "");
        setPhoneSecondary(p.phone_secondary || "");
        setMilitaryService(p.military_service || {});
        setHobbies(p.hobbies || "");
        setRoleModel(p.role_model || "");
        setRoleModelReason(p.role_model_reason || "");
        setAcademicNote(p.academic_note || "");
        // Load related tables
        const [e, c, l, cert, aw] = await Promise.all([
          api.get<CareerEntry[]>(`/api/profile/entries/${p.id}`),
          api.get<Course[]>(`/api/profile/courses/${p.id}`),
          api.get<LanguageTest[]>(`/api/profile/languages/${p.id}`),
          api.get<Certification[]>(`/api/profile/certifications/${p.id}`),
          api.get<Award[]>(`/api/profile/awards/${p.id}`),
        ]);
        setEntries(e);
        setCourses(c);
        setLanguageTests(l);
        setCertifications(cert);
        setAwards(aw);
      }
    } catch {
      // no profile yet
    } finally {
      setLoading(false);
    }
  }

  async function checkNotionStatus() {
    try {
      const s = await api.get<{ llm: SettingsLlm }>("/api/settings");
      setNotionEnabled(s.llm.notion.enabled && !!s.llm.notion.has_key);
    } catch {
      // settings unavailable
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("이름은 필수 항목입니다.");
      setActiveTab("basic");
      return;
    }
    setSaving(true);
    try {
      const data = {
        name,
        email: email || undefined,
        phone: phone || undefined,
        summary: summary || undefined,
        career_goal: careerGoal || undefined,
        core_values: coreValues.length > 0 ? coreValues : undefined,
        education: education.filter((e) => e.school),
        name_en: nameEn || undefined,
        address: address || undefined,
        phone_secondary: phoneSecondary || undefined,
        military_service: militaryService.status ? militaryService : undefined,
        hobbies: hobbies || undefined,
        role_model: roleModel || undefined,
        role_model_reason: roleModelReason || undefined,
        academic_note: academicNote || undefined,
      };

      if (profileId) {
        const updated = await api.put<Profile>(
          `/api/profile/${profileId}`,
          data
        );
        setProfileId(updated.id);
        toast.success("프로필이 수정되었습니다.");
      } else {
        const created = await api.post<Profile>("/api/profile", data);
        setProfileId(created.id);
        toast.success("프로필이 생성되었습니다.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleEntrySubmit(data: Record<string, unknown>) {
    if (editingEntry) {
      // Update existing entry
      await api.put<CareerEntry>(
        `/api/profile/entries/${editingEntry.id}`,
        data
      );
      toast.success("경력이 수정되었습니다.");
    } else {
      await api.post<CareerEntry>("/api/profile/entries", data);
      toast.success("경력이 추가되었습니다.");
    }
    setShowEntryForm(false);
    setEditingEntry(null);
    if (profileId) {
      const e = await api.get<CareerEntry[]>(
        `/api/profile/entries/${profileId}`
      );
      setEntries(e);
    }
  }

  async function handleDeleteEntry(entryId: string) {
    await api.delete(`/api/profile/entries/${entryId}`);
    setEntries(entries.filter((e) => e.id !== entryId));
    toast.success("경력이 삭제되었습니다.");
  }

  function applyParsedData(data: ParsedData) {
    if (data.profile) {
      const p = data.profile;
      if (p.name && typeof p.name === "string") setName(p.name);
      if (p.email && typeof p.email === "string") setEmail(p.email);
      if (p.phone && typeof p.phone === "string") setPhone(p.phone);
      if (p.summary && typeof p.summary === "string") setSummary(p.summary);
      if (p.career_goal && typeof p.career_goal === "string")
        setCareerGoal(p.career_goal);
      if (Array.isArray(p.core_values))
        setCoreValues(p.core_values as string[]);
      if (Array.isArray(p.education)) {
        const eduList = (p.education as Record<string, string>[]).map((e) => ({
          school: e.school || "",
          major: e.major || "",
          degree: e.degree || "",
          period: e.period || "",
        }));
        setEducation((prev) => [...prev, ...eduList]);
      }
    }
    setParsedPreview(null);
    toast.success("파싱된 데이터가 프로필에 반영되었습니다.");
    setActiveTab("basic");
  }

  const handleFileParsed = useCallback((data: Record<string, unknown>) => {
    setParsedPreview(data as ParsedData);
    toast.success("이력서가 파싱되었습니다. 데이터를 확인하세요.");
  }, []);

  async function handleNotionSearch() {
    setNotionSearching(true);
    setNotionPages([]);
    setSelectedNotionPage(null);
    try {
      const pages = await api.get<NotionPage[]>(
        `/api/profile/import/notion/pages?query=${encodeURIComponent(notionQuery)}`
      );
      setNotionPages(pages);
      if (pages.length === 0) toast.info("검색 결과가 없습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Notion 검색 실패");
    } finally {
      setNotionSearching(false);
    }
  }

  async function handleNotionImport() {
    if (!selectedNotionPage) return;
    setNotionImporting(true);
    try {
      const result = await api.post<Record<string, unknown>>(
        "/api/profile/import/notion",
        { page_id: selectedNotionPage }
      );
      setParsedPreview(result as ParsedData);
      toast.success("Notion 페이지를 가져왔습니다. 데이터를 확인하세요.");
      setSelectedNotionPage(null);
      setNotionPages([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Notion 가져오기 실패");
    } finally {
      setNotionImporting(false);
    }
  }

  // Education helpers
  function startAddEducation() {
    setEduDraft({ school: "", major: "", degree: "", period: "" });
    setAddingEdu(true);
    setEditingEduIndex(null);
  }

  function startEditEducation(index: number) {
    setEduDraft({ ...education[index] });
    setEditingEduIndex(index);
    setAddingEdu(false);
  }

  function saveEducation() {
    if (!eduDraft.school.trim()) {
      toast.error("학교명을 입력하세요.");
      return;
    }
    if (editingEduIndex !== null) {
      const updated = [...education];
      updated[editingEduIndex] = { ...eduDraft };
      setEducation(updated);
      setEditingEduIndex(null);
    } else {
      setEducation([...education, { ...eduDraft }]);
      setAddingEdu(false);
    }
    setEduDraft({ school: "", major: "", degree: "", period: "" });
  }

  function cancelEducation() {
    setEditingEduIndex(null);
    setAddingEdu(false);
    setEduDraft({ school: "", major: "", degree: "", period: "" });
  }

  function removeEducation(index: number) {
    setEducation(education.filter((_, i) => i !== index));
    if (editingEduIndex === index) cancelEducation();
  }

  const completion = computeCompletion(
    name,
    email,
    education,
    summary,
    careerGoal
  );

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">로딩 중...</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Progress */}
      <div>
        <h1 className="text-2xl font-bold">프로필 관리</h1>
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-muted-foreground">프로필 완성도</span>
            <span className="font-medium">{completion}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                completion < 40
                  ? "bg-red-500"
                  : completion < 70
                    ? "bg-yellow-500"
                    : "bg-green-500"
              )}
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Parse Preview */}
      {parsedPreview && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm font-medium mb-2">
              파싱된 데이터를 프로필에 반영하시겠습니까?
            </p>
            {parsedPreview.profile && (
              <div className="text-xs text-muted-foreground mb-3 space-y-0.5">
                {(parsedPreview.profile.name as string) && (
                  <p>이름: {parsedPreview.profile.name as string}</p>
                )}
                {(parsedPreview.profile.email as string) && (
                  <p>이메일: {parsedPreview.profile.email as string}</p>
                )}
                {Array.isArray(parsedPreview.profile.education) && (
                  <p>
                    학력: {parsedPreview.profile.education.length}건
                  </p>
                )}
                {parsedPreview.career_entries &&
                  parsedPreview.career_entries.length > 0 && (
                    <p>경력: {parsedPreview.career_entries.length}건</p>
                  )}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => applyParsedData(parsedPreview)}
              >
                반영하기
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setParsedPreview(null)}
              >
                취소
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Content */}
      {activeTab === "basic" && (
        <div className="space-y-6">
          <ProfileForm
            name={name}
            setName={setName}
            email={email}
            setEmail={setEmail}
            phone={phone}
            setPhone={setPhone}
            summary={summary}
            setSummary={setSummary}
            careerGoal={careerGoal}
            setCareerGoal={setCareerGoal}
            coreValues={coreValues}
            setCoreValues={setCoreValues}
          />

          {/* Samsung-style extended fields */}
          <Separator />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">추가 인적사항</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>영문 성 (Last Name)</Label>
                  <Input
                    value={nameEn.split(" ")[0] || ""}
                    onChange={(e) => {
                      const parts = nameEn.split(" ");
                      setNameEn(`${e.target.value} ${parts.slice(1).join(" ")}`.trim());
                    }}
                    placeholder="Hong"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>영문 이름 (First Name)</Label>
                  <Input
                    value={nameEn.split(" ").slice(1).join(" ") || ""}
                    onChange={(e) => {
                      const last = nameEn.split(" ")[0] || "";
                      setNameEn(`${last} ${e.target.value}`.trim());
                    }}
                    placeholder="Seungpyo"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>주소</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="서울특별시 강남구..." />
              </div>
              <div className="space-y-1.5">
                <Label>보조 연락처</Label>
                <Input value={phoneSecondary} onChange={(e) => setPhoneSecondary(e.target.value)} placeholder="010-0000-0000" />
              </div>
            </CardContent>
          </Card>

          {/* Military Service */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">병역사항</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>병역구분</Label>
                <Select
                  value={militaryService.status || ""}
                  onValueChange={(v) => setMilitaryService((prev) => ({ ...prev, status: v || undefined }))}
                >
                  <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent>
                    {MILITARY_STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(militaryService.status === "completed" || militaryService.status === "in_service") && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>군별</Label>
                      <Select
                        value={militaryService.branch || ""}
                        onValueChange={(v) => setMilitaryService((prev) => ({ ...prev, branch: v || undefined }))}
                      >
                        <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                        <SelectContent>
                          {BRANCH_OPTIONS.map((b) => (
                            <SelectItem key={b} value={b}>{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>계급</Label>
                      <Input
                        value={militaryService.rank || ""}
                        onChange={(e) => setMilitaryService((prev) => ({ ...prev, rank: e.target.value }))}
                        placeholder="병장"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>복무 시작</Label>
                      <Input
                        type="date"
                        value={militaryService.period_start || ""}
                        onChange={(e) => setMilitaryService((prev) => ({ ...prev, period_start: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>복무 종료</Label>
                      <Input
                        type="date"
                        value={militaryService.period_end || ""}
                        onChange={(e) => setMilitaryService((prev) => ({ ...prev, period_end: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>주요활동사항</Label>
                    <Input
                      value={militaryService.note || ""}
                      onChange={(e) => setMilitaryService((prev) => ({ ...prev, note: e.target.value }))}
                      placeholder="복무 중 특기사항 (100자 이내)"
                      maxLength={100}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "education" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">학력 정보</h2>
            {!addingEdu && editingEduIndex === null && (
              <Button variant="outline" size="sm" onClick={startAddEducation}>
                <Plus className="h-4 w-4 mr-1" />
                추가
              </Button>
            )}
          </div>

          {/* Education cards */}
          {education.map((edu, i) =>
            editingEduIndex === i ? (
              <Card key={i} className="border-primary/30">
                <CardContent className="pt-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>학교 *</Label>
                      <Input
                        list="school-suggestions"
                        value={eduDraft.school}
                        onChange={(e) =>
                          setEduDraft({ ...eduDraft, school: e.target.value })
                        }
                        placeholder="학교명 입력 또는 선택"
                      />
                      <datalist id="school-suggestions">
                        {SCHOOL_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
                      </datalist>
                    </div>
                    <div className="space-y-1.5">
                      <Label>전공</Label>
                      <Input
                        list="major-suggestions"
                        value={eduDraft.major}
                        onChange={(e) =>
                          setEduDraft({ ...eduDraft, major: e.target.value })
                        }
                        placeholder="전공 입력 또는 선택"
                      />
                      <datalist id="major-suggestions">
                        {MAJOR_SUGGESTIONS.map((m) => <option key={m} value={m} />)}
                      </datalist>
                    </div>
                    <div className="space-y-1.5">
                      <Label>학위</Label>
                      <Select
                        value={eduDraft.degree}
                        onValueChange={(v) =>
                          setEduDraft({ ...eduDraft, degree: v ?? "" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="학위 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEGREE_OPTIONS.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>기간</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={(eduDraft.period || "").split("~")[0]?.trim() || ""}
                          onChange={(e) => {
                            const end =
                              (eduDraft.period || "").split("~")[1]?.trim() || "";
                            setEduDraft({
                              ...eduDraft,
                              period: `${e.target.value} ~ ${end}`,
                            });
                          }}
                          className="text-xs"
                        />
                        <span className="text-muted-foreground shrink-0 text-xs">
                          ~
                        </span>
                        <Input
                          type="date"
                          value={(eduDraft.period || "").split("~")[1]?.trim() || ""}
                          onChange={(e) => {
                            const start =
                              (eduDraft.period || "").split("~")[0]?.trim() || "";
                            setEduDraft({
                              ...eduDraft,
                              period: `${start} ~ ${e.target.value}`,
                            });
                          }}
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </div>
                  {/* Samsung extended education fields */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3 pt-3 border-t border-dashed">
                    <div className="space-y-1.5">
                      <Label className="text-xs">졸업구분</Label>
                      <Select
                        value={eduDraft.graduation_status || ""}
                        onValueChange={(v) => setEduDraft({ ...eduDraft, graduation_status: v || undefined })}
                      >
                        <SelectTrigger className="text-xs"><SelectValue placeholder="선택" /></SelectTrigger>
                        <SelectContent>
                          {GRADUATION_STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">학점</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          value={eduDraft.gpa || ""}
                          onChange={(e) => setEduDraft({ ...eduDraft, gpa: e.target.value })}
                          placeholder="3.8"
                          className="text-xs w-16"
                        />
                        <span className="text-muted-foreground text-xs">/</span>
                        <Select
                          value={eduDraft.gpa_scale || "4.5"}
                          onValueChange={(v) => setEduDraft({ ...eduDraft, gpa_scale: v || undefined })}
                        >
                          <SelectTrigger className="text-xs w-16"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {GPA_SCALE_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">전공계열</Label>
                      <Select
                        value={eduDraft.major_category || ""}
                        onValueChange={(v) => setEduDraft({ ...eduDraft, major_category: v || undefined })}
                      >
                        <SelectTrigger className="text-xs"><SelectValue placeholder="선택" /></SelectTrigger>
                        <SelectContent>
                          {MAJOR_CATEGORY_OPTIONS.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">학위구분</Label>
                      <Select
                        value={eduDraft.degree_type || "주전공"}
                        onValueChange={(v) => setEduDraft({ ...eduDraft, degree_type: v || undefined })}
                      >
                        <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DEGREE_TYPE_OPTIONS.map((d) => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">복수전공</Label>
                      <Input
                        value={eduDraft.double_major || ""}
                        onChange={(e) => setEduDraft({ ...eduDraft, double_major: e.target.value })}
                        placeholder="경영학"
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">단과대학</Label>
                      <Input
                        value={eduDraft.college || ""}
                        onChange={(e) => setEduDraft({ ...eduDraft, college: e.target.value })}
                        placeholder="인문대"
                        className="text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={saveEducation}>
                      저장
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelEducation}
                    >
                      취소
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card key={i}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{edu.school}</p>
                        <p className="text-xs text-muted-foreground">
                          {[edu.major, edu.degree].filter(Boolean).join(" / ")}
                        </p>
                        {edu.period && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {edu.period}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => startEditEducation(i)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeEducation(i)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          )}

          {/* Add form */}
          {addingEdu && (
            <Card className="border-primary/30">
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>학교 *</Label>
                    <Input
                      value={eduDraft.school}
                      onChange={(e) =>
                        setEduDraft({ ...eduDraft, school: e.target.value })
                      }
                      placeholder="학교명"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>전공</Label>
                    <Input
                      value={eduDraft.major}
                      onChange={(e) =>
                        setEduDraft({ ...eduDraft, major: e.target.value })
                      }
                      placeholder="전공"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>학위</Label>
                    <Select
                      value={eduDraft.degree}
                      onValueChange={(v) =>
                        setEduDraft({ ...eduDraft, degree: v ?? "" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="학위 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEGREE_OPTIONS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>기간</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="시작년도"
                        value={(eduDraft.period || "").split("~")[0]?.trim() || ""}
                        onChange={(e) => {
                          const end =
                            (eduDraft.period || "").split("~")[1]?.trim() || "";
                          setEduDraft({
                            ...eduDraft,
                            period: `${e.target.value} ~ ${end}`,
                          });
                        }}
                      />
                      <span className="text-muted-foreground shrink-0">~</span>
                      <Input
                        placeholder="종료년도"
                        value={(eduDraft.period || "").split("~")[1]?.trim() || ""}
                        onChange={(e) => {
                          const start =
                            (eduDraft.period || "").split("~")[0]?.trim() || "";
                          setEduDraft({
                            ...eduDraft,
                            period: `${start} ~ ${e.target.value}`,
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEducation}>
                    추가
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelEducation}
                  >
                    취소
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {education.length === 0 && !addingEdu && (
            <p className="text-center text-muted-foreground py-8">
              등록된 학력이 없습니다. 추가 버튼을 눌러 학력을 입력하세요.
            </p>
          )}
        </div>
      )}

      {activeTab === "career" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">경력/프로젝트</h2>
            {!showEntryForm && profileId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingEntry(null);
                  setShowEntryForm(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                추가
              </Button>
            )}
          </div>

          {!profileId && (
            <p className="text-center text-muted-foreground py-8">
              프로필을 먼저 저장한 후 경력을 추가할 수 있습니다.
            </p>
          )}

          {profileId && showEntryForm && (
            <CareerEntryForm
              profileId={profileId}
              editEntry={editingEntry}
              onSubmit={handleEntrySubmit}
              onCancel={() => {
                setShowEntryForm(false);
                setEditingEntry(null);
              }}
            />
          )}

          {profileId && (
            <div className="space-y-3">
              {entries.map((entry) => (
                <Card key={entry.id}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{entry.entry_type}</Badge>
                        {entry.title}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditingEntry(entry);
                            setShowEntryForm(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteEntry(entry.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-0 pb-3">
                    <p className="text-sm text-muted-foreground">
                      {entry.content}
                    </p>
                    {entry.company && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {entry.company}{" "}
                        {entry.position && `| ${entry.position}`}
                      </p>
                    )}
                    {entry.period_start && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.period_start}
                        {entry.period_end && ` ~ ${entry.period_end}`}
                      </p>
                    )}
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {entry.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {entries.length === 0 && !showEntryForm && (
                <p className="text-center text-muted-foreground py-8">
                  등록된 경력이 없습니다. 추가 버튼을 눌러 경력을 입력하세요.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 이수교과목 탭 ── */}
      {activeTab === "courses" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">이수교과목</h2>
            {profileId && (
              <Button
                size="sm"
                onClick={() => {
                  const name = prompt("과목명을 입력하세요");
                  if (!name || !profileId) return;
                  const cat = prompt("구분 (major_required, major_elective, general, other)", "major_elective");
                  const credits = prompt("학점", "3");
                  api.post<Course>("/api/profile/courses", {
                    profile_id: profileId,
                    school_name: education[0]?.school || "미지정",
                    course_name: name,
                    category: cat || "major_elective",
                    credits: credits ? parseInt(credits) : 3,
                    year: new Date().getFullYear(),
                    semester: "1",
                  }).then((c) => {
                    setCourses((prev) => [c, ...prev]);
                    toast.success("교과목이 추가되었습니다.");
                  }).catch(() => toast.error("추가 실패"));
                }}
              >
                <Plus className="h-4 w-4 mr-1" />교과목 추가
              </Button>
            )}
          </div>
          {!profileId && (
            <p className="text-sm text-muted-foreground text-center py-8">
              프로필을 먼저 저장한 후 교과목을 추가할 수 있습니다.
            </p>
          )}
          {profileId && courses.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              등록된 교과목이 없습니다.
            </p>
          )}
          {courses.length > 0 && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {COURSE_CATEGORY_OPTIONS.map((cat) => {
                  const catCourses = courses.filter((c) => c.category === cat.value);
                  const totalCredits = catCourses.reduce((s, c) => s + (c.credits || 0), 0);
                  return (
                    <Card key={cat.value} className="text-center py-3">
                      <p className="text-xs text-muted-foreground">{cat.label}</p>
                      <p className="text-lg font-bold">{totalCredits}<span className="text-xs font-normal text-muted-foreground ml-0.5">학점</span></p>
                    </Card>
                  );
                })}
              </div>
              {/* Table */}
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
                            {COURSE_CATEGORY_OPTIONS.find((o) => o.value === c.category)?.label || c.category}
                          </Badge>
                        </td>
                        <td className="py-2 px-2 text-center">{c.credits}</td>
                        <td className="py-2 px-2 text-center text-muted-foreground">
                          {c.year && c.semester ? `${c.year}-${SEMESTER_OPTIONS.find((s) => s.value === c.semester)?.label || c.semester}` : "-"}
                        </td>
                        <td className="py-2 px-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              api.delete(`/api/profile/courses/item/${c.id}`).then(() => {
                                setCourses((prev) => prev.filter((x) => x.id !== c.id));
                                toast.success("삭제되었습니다.");
                              });
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── 외국어·자격 탭 ── */}
      {activeTab === "languages" && (
        <div className="space-y-6">
          {!profileId && (
            <p className="text-sm text-muted-foreground text-center py-8">
              프로필을 먼저 저장한 후 외국어/자격 정보를 추가할 수 있습니다.
            </p>
          )}
          {profileId && (
            <>
              {/* Language Tests */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    외국어 시험
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const testName = prompt("시험명 (OPIc, TOEIC, TOEIC-Speaking, TOEFL 등)");
                        if (!testName || !profileId) return;
                        const score = prompt("점수 또는 등급");
                        const testDate = prompt("응시일자 (YYYY-MM-DD)");
                        api.post<LanguageTest>("/api/profile/languages", {
                          profile_id: profileId,
                          test_name: testName,
                          score: score || undefined,
                          level: score || undefined,
                          test_date: testDate || undefined,
                          language: "영어",
                        }).then((lt) => {
                          setLanguageTests((prev) => [lt, ...prev]);
                          toast.success("추가되었습니다.");
                        }).catch(() => toast.error("추가 실패"));
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />추가
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {languageTests.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">등록된 어학 시험이 없습니다.</p>
                  ) : (
                    <div className="space-y-2">
                      {languageTests.map((lt) => (
                        <div key={lt.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div>
                            <p className="font-medium text-sm">{lt.test_name} <Badge variant="secondary" className="text-[10px] ml-1">{lt.language}</Badge></p>
                            <p className="text-xs text-muted-foreground">
                              {lt.score || lt.level || "-"} {lt.test_date ? `· ${lt.test_date}` : ""}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            api.delete(`/api/profile/languages/item/${lt.id}`).then(() => {
                              setLanguageTests((prev) => prev.filter((x) => x.id !== lt.id));
                            });
                          }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Certifications */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    자격증/면허
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const certName = prompt("자격증명");
                        if (!certName || !profileId) return;
                        const issuer = prompt("발급기관");
                        const date = prompt("취득일자 (YYYY-MM-DD)");
                        api.post<Certification>("/api/profile/certifications", {
                          profile_id: profileId,
                          cert_name: certName,
                          issuer: issuer || undefined,
                          acquired_date: date || undefined,
                        }).then((c) => {
                          setCertifications((prev) => [c, ...prev]);
                          toast.success("추가되었습니다.");
                        }).catch(() => toast.error("추가 실패"));
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />추가
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {certifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">등록된 자격증이 없습니다.</p>
                  ) : (
                    <div className="space-y-2">
                      {certifications.map((c) => (
                        <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div>
                            <p className="font-medium text-sm">{c.cert_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.issuer || ""} {c.acquired_date ? `· ${c.acquired_date}` : ""}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            api.delete(`/api/profile/certifications/item/${c.id}`).then(() => {
                              setCertifications((prev) => prev.filter((x) => x.id !== c.id));
                            });
                          }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Awards */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    수상경력
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const title = prompt("수상내용");
                        if (!title || !profileId) return;
                        const org = prompt("시상단체");
                        const date = prompt("수상일자 (YYYY-MM-DD)");
                        api.post<Award>("/api/profile/awards", {
                          profile_id: profileId,
                          title,
                          organization: org || undefined,
                          award_date: date || undefined,
                        }).then((a) => {
                          setAwards((prev) => [a, ...prev]);
                          toast.success("추가되었습니다.");
                        }).catch(() => toast.error("추가 실패"));
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />추가
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {awards.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">등록된 수상경력이 없습니다.</p>
                  ) : (
                    <div className="space-y-2">
                      {awards.map((a) => (
                        <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div>
                            <p className="font-medium text-sm">{a.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {a.organization || ""} {a.award_date ? `· ${a.award_date}` : ""}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            api.delete(`/api/profile/awards/item/${a.id}`).then(() => {
                              setAwards((prev) => prev.filter((x) => x.id !== a.id));
                            });
                          }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── Essay 탭 ── */}
      {activeTab === "essay" && (
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">취미/특기 & 존경인물</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>취미/특기</Label>
                <Input
                  value={hobbies}
                  onChange={(e) => setHobbies(e.target.value)}
                  placeholder="예: 독서, 등산, 프로그래밍"
                />
              </div>
              <div className="space-y-1.5">
                <Label>존경인물</Label>
                <Input
                  value={roleModel}
                  onChange={(e) => setRoleModel(e.target.value)}
                  placeholder="예: 이순신, 스티브 잡스"
                />
              </div>
              <div className="space-y-1.5">
                <Label>존경이유</Label>
                <Textarea
                  value={roleModelReason}
                  onChange={(e) => setRoleModelReason(e.target.value)}
                  rows={3}
                  placeholder="존경하는 이유를 작성해 주세요"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">자기소개서 (Essay)</CardTitle>
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
      )}

      {activeTab === "import" && (
        <div className="space-y-6">
          {/* File Upload */}
          <FileUpload onParsed={handleFileParsed} />

          <Separator />

          {/* Notion Import */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notion에서 가져오기
                </div>
                {notionEnabled ? (
                  <Badge variant="secondary" className="text-[10px]">
                    연결됨
                  </Badge>
                ) : (
                  <Link href="/settings">
                    <Badge
                      variant="outline"
                      className="text-[10px] cursor-pointer hover:bg-accent"
                    >
                      설정 필요
                    </Badge>
                  </Link>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {notionEnabled ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={notionQuery}
                      onChange={(e) => setNotionQuery(e.target.value)}
                      placeholder="페이지 제목으로 검색 (예: 이력서, 경력)"
                      className="text-sm"
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleNotionSearch()
                      }
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNotionSearch}
                      disabled={notionSearching}
                    >
                      <Search className="h-3.5 w-3.5 mr-1" />
                      {notionSearching ? "검색 중..." : "검색"}
                    </Button>
                  </div>

                  {notionPages.length > 0 && (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {notionPages.map((page) => (
                        <button
                          key={page.id}
                          onClick={() =>
                            setSelectedNotionPage(
                              selectedNotionPage === page.id ? null : page.id
                            )
                          }
                          className={cn(
                            "w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm transition-colors",
                            selectedNotionPage === page.id
                              ? "bg-primary/10 border border-primary/20"
                              : "hover:bg-muted/50"
                          )}
                        >
                          <span className="text-base shrink-0">
                            {page.icon || "📄"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{page.title}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(page.last_edited).toLocaleDateString(
                                "ko-KR"
                              )}
                            </p>
                          </div>
                          {page.url && (
                            <a
                              href={page.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="shrink-0"
                            >
                              <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </a>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedNotionPage && (
                    <Button
                      size="sm"
                      onClick={handleNotionImport}
                      disabled={notionImporting}
                      className="w-full"
                    >
                      {notionImporting
                        ? "가져오는 중..."
                        : "선택한 페이지 가져오기"}
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  <Link
                    href="/settings"
                    className="text-primary hover:underline"
                  >
                    Settings
                  </Link>
                  에서 Notion API Key를 설정하면 Notion 페이지에서 경력 데이터를
                  가져올 수 있습니다.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Save Button - always visible */}
      <Separator />
      <Button
        onClick={handleSave}
        disabled={saving || !name.trim()}
        className="w-full btn-gradient border-0"
      >
        {saving ? "저장 중..." : profileId ? "프로필 수정" : "프로필 생성"}
      </Button>
    </div>
  );
}
