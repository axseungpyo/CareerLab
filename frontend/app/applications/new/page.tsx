"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { Resume } from "@/lib/types";

interface ParsedResult {
  company_name?: string;
  job_title?: string;
  deadline?: string;
  requirements?: string[];
  keywords?: string[];
}

export default function NewApplicationPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [jobUrl, setJobUrl] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [notes, setNotes] = useState("");
  const [resumeId, setResumeId] = useState("");
  const [parsedData, setParsedData] = useState<ParsedResult | null>(null);

  useEffect(() => {
    api.get<Resume[]>("/api/resume").then(setResumes).catch(() => {});
  }, []);

  async function handleParse() {
    if (!jobUrl.trim()) {
      toast.error("URL을 입력해주세요");
      return;
    }
    setParsing(true);
    try {
      const data = await api.post<ParsedResult>("/api/applications/parse-url", {
        url: jobUrl,
      });
      setParsedData(data);
      if (data.company_name) setCompanyName(data.company_name);
      if (data.job_title) setJobTitle(data.job_title);
      if (data.deadline) setDeadline(data.deadline);
      toast.success("채용공고 파싱 완료");
    } catch {
      toast.error("URL 파싱에 실패했습니다");
    } finally {
      setParsing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) {
      toast.error("회사명은 필수입니다");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/applications", {
        company_name: companyName,
        job_title: jobTitle || null,
        job_url: jobUrl || null,
        deadline: deadline || null,
        interview_date: interviewDate || null,
        notes: notes || null,
        resume_id: resumeId || null,
        parsed_data: parsedData || null,
      });
      toast.success("지원이 등록되었습니다");
      router.push("/applications");
    } catch {
      toast.error("등록에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/applications">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">새 지원 등록</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* URL Parse Section */}
        <Card className="glass-card">
          <CardHeader className="py-3">
            <CardTitle className="text-base">채용공고 URL 파싱</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="https://..."
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleParse}
                disabled={parsing}
              >
                {parsing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1" />
                )}
                자동 파싱
              </Button>
            </div>
            {parsedData && parsedData.requirements && parsedData.requirements.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">파싱된 요구사항:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {parsedData.requirements.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Fields */}
        <Card className="glass-card">
          <CardHeader className="py-3">
            <CardTitle className="text-base">지원 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">회사명 *</Label>
              <Input
                id="company_name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="회사명"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job_title">직무/포지션</Label>
              <Input
                id="job_title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="직무명"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deadline">마감일</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interview_date">면접일</Label>
                <Input
                  id="interview_date"
                  type="date"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>연결할 자소서</Label>
              <Select value={resumeId} onValueChange={(v) => { if (v) setResumeId(v); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="자소서 선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  {resumes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">메모</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="메모 (선택사항)"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Link href="/applications">
            <Button type="button" variant="outline">
              취소
            </Button>
          </Link>
          <Button type="submit" className="btn-gradient border-0" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            등록하기
          </Button>
        </div>
      </form>
    </div>
  );
}
