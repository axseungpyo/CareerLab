"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { Profile, Resume } from "@/lib/types";

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);

  useEffect(() => {
    api.get<Profile | null>("/api/profile").then(setProfile).catch(() => {});
    api.get<Resume[]>("/api/resume").then(setResumes).catch(() => {});
  }, []);

  const profileProgress = profile
    ? [
        profile.name,
        profile.email,
        profile.education?.length,
        profile.summary,
        profile.career_goal,
      ].filter(Boolean).length * 20
    : 0;

  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold mb-2">CareerLab</h1>
        <p className="text-muted-foreground">AI 커리어 컨설팅 에이전트</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/profile">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <div className="text-2xl mb-2">👤</div>
              <h3 className="font-semibold">프로필 관리</h3>
              <p className="text-xs text-muted-foreground mt-1">이력/경력 데이터</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/resume/new">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <div className="text-2xl mb-2">📝</div>
              <h3 className="font-semibold">자소서 생성</h3>
              <p className="text-xs text-muted-foreground mt-1">기업별 맞춤</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/interview">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <div className="text-2xl mb-2">🎤</div>
              <h3 className="font-semibold">면접 코칭</h3>
              <p className="text-xs text-muted-foreground mt-1">모의면접 + 평가</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/review">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardContent className="pt-6 text-center">
              <div className="text-2xl mb-2">🔍</div>
              <h3 className="font-semibold">자소서 첨삭</h3>
              <p className="text-xs text-muted-foreground mt-1">4축 분석</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              프로필 완성도
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profileProgress}%</div>
            <div className="w-full bg-secondary rounded-full h-2 mt-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${profileProgress}%` }}
              />
            </div>
            {!profile && (
              <Link href="/profile">
                <Button variant="outline" size="sm" className="mt-3">
                  프로필 작성하기
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              지원 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div>
                <div className="text-2xl font-bold">{resumes.length}</div>
                <div className="text-xs text-muted-foreground">전체</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {resumes.filter((r) => r.status === "submitted").length}
                </div>
                <div className="text-xs text-muted-foreground">제출</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {resumes.filter((r) => r.result === "pass").length}
                </div>
                <div className="text-xs text-muted-foreground">합격</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Resumes */}
      {resumes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              최근 자소서
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {resumes.slice(0, 5).map((resume) => (
                <Link
                  key={resume.id}
                  href={`/resume/${resume.id}`}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-accent"
                >
                  <span className="text-sm">{resume.title}</span>
                  <Badge variant="secondary">{resume.status}</Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
