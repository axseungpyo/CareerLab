"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Search, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import ProfileForm from "@/components/profile/profile-form";
import CareerEntryForm from "@/components/profile/career-entry-form";
import FileUpload from "@/components/profile/file-upload";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Profile, CareerEntry } from "@/lib/types";

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

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<CareerEntry[]>([]);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Notion state
  const [notionEnabled, setNotionEnabled] = useState(false);
  const [notionQuery, setNotionQuery] = useState("");
  const [notionPages, setNotionPages] = useState<NotionPage[]>([]);
  const [notionSearching, setNotionSearching] = useState(false);
  const [notionImporting, setNotionImporting] = useState(false);
  const [selectedNotionPage, setSelectedNotionPage] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
    checkNotionStatus();
  }, []);

  async function loadProfile() {
    try {
      const p = await api.get<Profile | null>("/api/profile");
      setProfile(p);
      if (p) {
        const e = await api.get<CareerEntry[]>(
          `/api/profile/entries/${p.id}`
        );
        setEntries(e);
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

  async function handleProfileSubmit(data: Record<string, unknown>) {
    if (profile) {
      const updated = await api.put<Profile>(
        `/api/profile/${profile.id}`,
        data
      );
      setProfile(updated);
      toast.success("프로필이 수정되었습니다.");
    } else {
      const created = await api.post<Profile>("/api/profile", data);
      setProfile(created);
      toast.success("프로필이 생성되었습니다.");
    }
  }

  async function handleEntrySubmit(data: Record<string, unknown>) {
    await api.post<CareerEntry>("/api/profile/entries", data);
    toast.success("경력이 추가되었습니다.");
    setShowEntryForm(false);
    if (profile) {
      const e = await api.get<CareerEntry[]>(
        `/api/profile/entries/${profile.id}`
      );
      setEntries(e);
    }
  }

  async function handleDeleteEntry(entryId: string) {
    await api.delete(`/api/profile/entries/${entryId}`);
    setEntries(entries.filter((e) => e.id !== entryId));
    toast.success("경력이 삭제되었습니다.");
  }

  function handleFileParsed(data: Record<string, unknown>) {
    toast.success("이력서가 파싱되었습니다. 데이터를 확인하세요.");
    if (data.profile) {
      const p = data.profile as Record<string, unknown>;
      console.log("Parsed profile:", p);
      console.log("Parsed entries:", data.career_entries);
    }
  }

  async function handleNotionSearch() {
    setNotionSearching(true);
    setNotionPages([]);
    setSelectedNotionPage(null);
    try {
      const pages = await api.get<NotionPage[]>(
        `/api/profile/import/notion/pages?query=${encodeURIComponent(notionQuery)}`
      );
      setNotionPages(pages);
      if (pages.length === 0) {
        toast.info("검색 결과가 없습니다.");
      }
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
      toast.success("Notion 페이지를 가져왔습니다. 데이터를 확인하세요.");
      if (result.profile) {
        console.log("Notion parsed profile:", result.profile);
        console.log("Notion parsed entries:", result.career_entries);
      }
      setSelectedNotionPage(null);
      setNotionPages([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Notion 가져오기 실패");
    } finally {
      setNotionImporting(false);
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">프로필 관리</h1>
      </div>

      {/* File Upload */}
      <FileUpload onParsed={handleFileParsed} />

      {/* Notion Import */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notion에서 가져오기
            </div>
            {notionEnabled ? (
              <Badge variant="secondary" className="text-[10px]">연결됨</Badge>
            ) : (
              <Link href="/settings">
                <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-accent">
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
                  onKeyDown={(e) => e.key === "Enter" && handleNotionSearch()}
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
                      onClick={() => setSelectedNotionPage(
                        selectedNotionPage === page.id ? null : page.id
                      )}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm transition-colors",
                        selectedNotionPage === page.id
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <span className="text-base shrink-0">{page.icon || "📄"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{page.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(page.last_edited).toLocaleDateString("ko-KR")}
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
                  {notionImporting ? "가져오는 중..." : "선택한 페이지 가져오기"}
                </Button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              <Link href="/settings" className="text-primary hover:underline">
                Settings
              </Link>
              에서 Notion API Key를 설정하면 Notion 페이지에서 경력 데이터를 가져올 수 있습니다.
            </p>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Profile Form */}
      <ProfileForm profile={profile} onSubmit={handleProfileSubmit} />

      {/* Career Entries */}
      {profile && (
        <>
          <Separator />
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">경력/프로젝트</h2>
            <Button
              variant="outline"
              onClick={() => setShowEntryForm(!showEntryForm)}
            >
              {showEntryForm ? "취소" : "+ 추가"}
            </Button>
          </div>

          {showEntryForm && (
            <CareerEntryForm
              profileId={profile.id}
              onSubmit={handleEntrySubmit}
              onCancel={() => setShowEntryForm(false)}
            />
          )}

          <div className="space-y-3">
            {entries.map((entry) => (
              <Card key={entry.id}>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{entry.entry_type}</Badge>
                      {entry.title}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteEntry(entry.id)}
                    >
                      삭제
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-0 pb-3">
                  <p className="text-sm text-muted-foreground">{entry.content}</p>
                  {entry.company && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {entry.company} {entry.position && `| ${entry.position}`}
                    </p>
                  )}
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {entry.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {entries.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                등록된 경력이 없습니다. 위에서 추가해보세요.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
