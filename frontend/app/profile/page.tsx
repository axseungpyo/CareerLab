"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import ProfileForm from "@/components/profile/profile-form";
import CareerEntryForm from "@/components/profile/career-entry-form";
import FileUpload from "@/components/profile/file-upload";
import { api } from "@/lib/api";
import type { Profile, CareerEntry } from "@/lib/types";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<CareerEntry[]>([]);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
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
    // Auto-fill profile form with parsed data
    if (data.profile) {
      const p = data.profile as Record<string, unknown>;
      // User can review in console, then manually apply
      console.log("Parsed profile:", p);
      console.log("Parsed entries:", data.career_entries);
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
