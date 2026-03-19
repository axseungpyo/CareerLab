"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Profile, CareerEntry, Education, Course, LanguageTest, Certification, Award, MilitaryService } from "@/lib/types";
import ProfileForm from "@/components/profile/profile-form";
import BasicInfoExtended from "@/components/profile/basic-info-extended";
import MilitaryForm from "@/components/profile/military-form";
import EducationTab from "@/components/profile/education-tab";
import CourseTab from "@/components/profile/course-tab";
import CareerTab from "@/components/profile/career-tab";
import LanguageTab from "@/components/profile/language-tab";
import EssayTab from "@/components/profile/essay-tab";
import ImportTab from "@/components/profile/import-tab";

type TabId = "basic" | "education" | "courses" | "career" | "languages" | "essay" | "import";
interface NotionPage { id: string; title: string; url: string; icon: string | null; last_edited: string }
interface ParsedData { profile?: Record<string, unknown>; career_entries?: Record<string, unknown>[] }

const TABS: { id: TabId; label: string }[] = [
  { id: "basic", label: "기본정보" }, { id: "education", label: "학력" }, { id: "courses", label: "이수교과목" },
  { id: "career", label: "경력" }, { id: "languages", label: "외국어·자격" }, { id: "essay", label: "자기소개" },
  { id: "import", label: "가져오기" },
];

function computeCompletion(n: string, e: string, edu: Education[], s: string, g: string) {
  let f = 0;
  if (n.trim()) f++; if (e.trim()) f++;
  if (edu.length > 0 && edu.some((x) => x.school.trim())) f++;
  if (s.trim()) f++; if (g.trim()) f++;
  return Math.round((f / 5) * 100);
}

export default function ProfilePage() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("basic");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [summary, setSummary] = useState("");
  const [careerGoal, setCareerGoal] = useState("");
  const [coreValues, setCoreValues] = useState<string[]>([]);
  const [nameEn, setNameEn] = useState("");
  const [nameHanja, setNameHanja] = useState("");
  const [phoneSecondary, setPhoneSecondary] = useState("");
  const [militaryService, setMilitaryService] = useState<MilitaryService>({});
  const [hobbies, setHobbies] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [roleModel, setRoleModel] = useState("");
  const [roleModelReason, setRoleModelReason] = useState("");
  const [growthBackground, setGrowthBackground] = useState("");
  const [personalValues, setPersonalValues] = useState("");
  const [strengthWeakness, setStrengthWeakness] = useState("");
  const [academicNote, setAcademicNote] = useState("");
  const [education, setEducation] = useState<Education[]>([]);
  const [entries, setEntries] = useState<CareerEntry[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [languageTests, setLanguageTests] = useState<LanguageTest[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [parsedPreview, setParsedPreview] = useState<ParsedData | null>(null);
  const [notionEnabled, setNotionEnabled] = useState(false);
  const [notionQuery, setNotionQuery] = useState("");
  const [notionPages, setNotionPages] = useState<NotionPage[]>([]);
  const [notionSearching, setNotionSearching] = useState(false);
  const [notionImporting, setNotionImporting] = useState(false);
  const [selectedNotionPage, setSelectedNotionPage] = useState<string | null>(null);

  useEffect(() => { loadProfile(); checkNotionStatus(); }, []);

  async function loadProfile() {
    try {
      const p = await api.get<Profile | null>("/api/profile");
      if (p) {
        setProfileId(p.id); setName(p.name || ""); setEmail(p.email || "");
        setPhone(p.phone || ""); setSummary(p.summary || "");
        setCareerGoal(p.career_goal || ""); setCoreValues(p.core_values || []);
        setEducation(p.education || []); setNameEn(p.name_en || "");
        setNameHanja(p.name_hanja || ""); setPhoneSecondary(p.phone_secondary || "");
        const ms = p.military_service || {};
        if (ms.status) {
          const legacyMap: Record<string, string> = { completed: "복무완료", not_served: "미필", not_applicable: "비대상", exempted: "면제" };
          if (legacyMap[ms.status]) ms.status = legacyMap[ms.status];
        }
        setMilitaryService(ms); setHobbies(p.hobbies || "");
        setSpecialties(p.specialties || "");
        setRoleModel(p.role_model || ""); setRoleModelReason(p.role_model_reason || "");
        setGrowthBackground(p.growth_background || "");
        setPersonalValues(p.personal_values || "");
        setStrengthWeakness(p.strength_weakness || "");
        setAcademicNote(p.academic_note || "");
        const [e, c, l, cert, aw] = await Promise.all([
          api.get<CareerEntry[]>(`/api/profile/entries/${p.id}`),
          api.get<Course[]>(`/api/profile/courses/${p.id}`),
          api.get<LanguageTest[]>(`/api/profile/languages/${p.id}`),
          api.get<Certification[]>(`/api/profile/certifications/${p.id}`),
          api.get<Award[]>(`/api/profile/awards/${p.id}`),
        ]);
        setEntries(e); setCourses(c); setLanguageTests(l); setCertifications(cert); setAwards(aw);
      }
    } catch { /* no profile yet */ } finally { setLoading(false); }
  }

  async function checkNotionStatus() {
    try {
      const s = await api.get<{ llm: { notion: { enabled: boolean; has_key?: boolean } } }>("/api/settings");
      setNotionEnabled(s.llm.notion.enabled && !!s.llm.notion.has_key);
    } catch { /* settings unavailable */ }
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("이름은 필수 항목입니다."); setActiveTab("basic"); return; }
    setSaving(true);
    try {
      const data = {
        name, email: email || undefined, phone: phone || undefined,
        summary: summary || undefined, career_goal: careerGoal || undefined,
        core_values: coreValues.length > 0 ? coreValues : undefined,
        education: education.filter((e) => e.school),
        name_en: nameEn || undefined, name_hanja: nameHanja || undefined,
        phone_secondary: phoneSecondary || undefined,
        military_service: militaryService.status ? militaryService : undefined,
        hobbies: hobbies || undefined, specialties: specialties || undefined,
        role_model: roleModel || undefined, role_model_reason: roleModelReason || undefined,
        growth_background: growthBackground || undefined, personal_values: personalValues || undefined,
        strength_weakness: strengthWeakness || undefined, academic_note: academicNote || undefined,
      };
      if (profileId) {
        setProfileId((await api.put<Profile>(`/api/profile/${profileId}`, data)).id);
        toast.success("프로필이 수정되었습니다.");
      } else {
        setProfileId((await api.post<Profile>("/api/profile", data)).id);
        toast.success("프로필이 생성되었습니다.");
      }
    } catch (e) { toast.error(e instanceof Error ? e.message : "저장 실패"); }
    finally { setSaving(false); }
  }

  const handleFileParsed = useCallback((data: Record<string, unknown>) => {
    setParsedPreview(data as ParsedData);
    toast.success("이력서가 파싱되었습니다. 데이터를 확인하세요.");
  }, []);

  function applyParsedData(data: ParsedData) {
    if (data.profile) {
      const p = data.profile;
      if (typeof p.name === "string") setName(p.name);
      if (typeof p.email === "string") setEmail(p.email);
      if (typeof p.phone === "string") setPhone(p.phone);
      if (typeof p.summary === "string") setSummary(p.summary);
      if (typeof p.career_goal === "string") setCareerGoal(p.career_goal);
      if (Array.isArray(p.core_values)) setCoreValues(p.core_values as string[]);
      if (Array.isArray(p.education)) {
        const list = (p.education as Record<string, string>[]).map((e) => ({
          school: e.school || "", major: e.major || "", degree: e.degree || "", period: e.period || "",
        }));
        setEducation((prev) => [...prev, ...list]);
      }
    }
    setParsedPreview(null);
    toast.success("파싱된 데이터가 프로필에 반영되었습니다.");
    setActiveTab("basic");
  }

  async function handleNotionSearch() {
    setNotionSearching(true); setNotionPages([]); setSelectedNotionPage(null);
    try {
      const pages = await api.get<NotionPage[]>(`/api/profile/import/notion/pages?query=${encodeURIComponent(notionQuery)}`);
      setNotionPages(pages);
      if (pages.length === 0) toast.info("검색 결과가 없습니다.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Notion 검색 실패"); }
    finally { setNotionSearching(false); }
  }

  async function handleNotionImport() {
    if (!selectedNotionPage) return;
    setNotionImporting(true);
    try {
      setParsedPreview(await api.post<Record<string, unknown>>("/api/profile/import/notion", { page_id: selectedNotionPage }) as ParsedData);
      toast.success("Notion 페이지를 가져왔습니다."); setSelectedNotionPage(null); setNotionPages([]);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Notion 가져오기 실패"); }
    finally { setNotionImporting(false); }
  }

  const completion = computeCompletion(name, email, education, summary, careerGoal);
  if (loading) return <div className="text-center py-12 text-muted-foreground">로딩 중...</div>;

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
            <div className={cn("h-full rounded-full transition-all duration-500",
              completion < 40 ? "bg-red-500" : completion < 70 ? "bg-yellow-500" : "bg-green-500")}
              style={{ width: `${completion}%` }} />
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors",
              activeTab === tab.id ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground")}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "basic" && (
        <div className="space-y-6">
          <ProfileForm name={name} setName={setName} email={email} setEmail={setEmail}
            phone={phone} setPhone={setPhone} summary={summary} setSummary={setSummary}
            careerGoal={careerGoal} setCareerGoal={setCareerGoal} coreValues={coreValues} setCoreValues={setCoreValues} />
          <Separator />
          <BasicInfoExtended nameEn={nameEn} setNameEn={setNameEn} nameHanja={nameHanja}
            setNameHanja={setNameHanja} phoneSecondary={phoneSecondary} setPhoneSecondary={setPhoneSecondary} />
          <MilitaryForm value={militaryService} onChange={setMilitaryService} />
        </div>
      )}
      {activeTab === "education" && (
        <EducationTab education={education} setEducation={setEducation} academicNote={academicNote} setAcademicNote={setAcademicNote} />
      )}
      {activeTab === "courses" && (
        <CourseTab profileId={profileId} courses={courses} setCourses={setCourses} education={education} />
      )}
      {activeTab === "career" && <CareerTab profileId={profileId} entries={entries} setEntries={setEntries} />}
      {activeTab === "languages" && (
        <LanguageTab profileId={profileId} languageTests={languageTests} setLanguageTests={setLanguageTests}
          certifications={certifications} setCertifications={setCertifications} awards={awards} setAwards={setAwards} />
      )}
      {activeTab === "essay" && (
        <EssayTab hobbies={hobbies} setHobbies={setHobbies} specialties={specialties} setSpecialties={setSpecialties}
          roleModel={roleModel} setRoleModel={setRoleModel} roleModelReason={roleModelReason} setRoleModelReason={setRoleModelReason}
          growthBackground={growthBackground} setGrowthBackground={setGrowthBackground}
          personalValues={personalValues} setPersonalValues={setPersonalValues}
          strengthWeakness={strengthWeakness} setStrengthWeakness={setStrengthWeakness} />
      )}
      {activeTab === "import" && (
        <ImportTab onFileParsed={handleFileParsed} parsedPreview={parsedPreview} onApplyParsed={applyParsedData}
          notionEnabled={notionEnabled} notionQuery={notionQuery} setNotionQuery={setNotionQuery}
          notionPages={notionPages} notionSearching={notionSearching} notionImporting={notionImporting}
          selectedNotionPage={selectedNotionPage} setSelectedNotionPage={setSelectedNotionPage}
          onNotionSearch={handleNotionSearch} onNotionImport={handleNotionImport} />
      )}

      {/* Save Button */}
      <Button onClick={handleSave} disabled={saving} className="w-full btn-gradient border-0">
        {saving ? "저장 중..." : profileId ? "프로필 수정" : "프로필 저장"}
      </Button>
    </div>
  );
}
