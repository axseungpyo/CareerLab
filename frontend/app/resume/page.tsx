"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/empty-state";
import { api } from "@/lib/api";
import type { Resume } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  draft: "작성중",
  final: "완성",
  submitted: "제출",
};

const RESULT_LABEL: Record<string, string> = {
  pass: "합격",
  fail: "불합격",
  pending: "대기중",
};

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Resume[]>("/api/resume")
      .then(setResumes)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">자소서 관리</h1>
        <Link href="/resume/new">
          <Button>새 자소서 생성</Button>
        </Link>
      </div>

      {resumes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="아직 작성한 자소서가 없어요"
          description="채용공고를 붙여넣으면 AI가 기업에 맞춘 자소서를 생성합니다"
          action={{ label: "첫 자소서 만들기", href: "/resume/new" }}
        />
      ) : (
        <div className="grid gap-4">
          {resumes.map((resume) => (
            <Link key={resume.id} href={`/resume/${resume.id}`}>
              <Card className="hover:border-primary transition-all cursor-pointer hover-card">
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    {resume.title}
                    <div className="flex gap-2">
                      <Badge variant="secondary">
                        {STATUS_LABEL[resume.status] || resume.status}
                      </Badge>
                      {resume.result && (
                        <Badge
                          variant={
                            resume.result === "pass" ? "default" : "secondary"
                          }
                        >
                          {RESULT_LABEL[resume.result] || resume.result}
                        </Badge>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-0 pb-3">
                  <p className="text-xs text-muted-foreground">
                    {new Date(resume.created_at).toLocaleDateString("ko-KR")}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
