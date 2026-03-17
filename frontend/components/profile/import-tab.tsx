"use client";

import Link from "next/link";
import { Search, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import FileUpload from "@/components/profile/file-upload";
import { cn } from "@/lib/utils";

interface NotionPage {
  id: string;
  title: string;
  url: string;
  icon: string | null;
  last_edited: string;
}

interface ParsedData {
  profile?: Record<string, unknown>;
  career_entries?: Record<string, unknown>[];
}

interface ImportTabProps {
  onFileParsed: (data: Record<string, unknown>) => void;
  parsedPreview: ParsedData | null;
  onApplyParsed: (data: ParsedData) => void;
  notionEnabled: boolean;
  notionQuery: string;
  setNotionQuery: (v: string) => void;
  notionPages: NotionPage[];
  notionSearching: boolean;
  notionImporting: boolean;
  selectedNotionPage: string | null;
  setSelectedNotionPage: (v: string | null) => void;
  onNotionSearch: () => void;
  onNotionImport: () => void;
}

export default function ImportTab({
  onFileParsed, parsedPreview, onApplyParsed, notionEnabled,
  notionQuery, setNotionQuery, notionPages, notionSearching,
  notionImporting, selectedNotionPage, setSelectedNotionPage,
  onNotionSearch, onNotionImport,
}: ImportTabProps) {
  return (
    <div className="space-y-6">
      <FileUpload onParsed={onFileParsed} />

      {/* Parsed Preview */}
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
                  <p>학력: {parsedPreview.profile.education.length}건</p>
                )}
                {parsedPreview.career_entries && parsedPreview.career_entries.length > 0 && (
                  <p>경력: {parsedPreview.career_entries.length}건</p>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => onApplyParsed(parsedPreview)}>
                반영하기
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={() => onApplyParsed(null as unknown as ParsedData)}
              >
                취소
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                  onKeyDown={(e) => e.key === "Enter" && onNotionSearch()}
                />
                <Button variant="outline" size="sm" onClick={onNotionSearch} disabled={notionSearching}>
                  <Search className="h-3.5 w-3.5 mr-1" />
                  {notionSearching ? "검색 중..." : "검색"}
                </Button>
              </div>
              {notionPages.length > 0 && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {notionPages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => setSelectedNotionPage(selectedNotionPage === page.id ? null : page.id)}
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
                          href={page.url} target="_blank" rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()} className="shrink-0"
                        >
                          <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </a>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {selectedNotionPage && (
                <Button size="sm" onClick={onNotionImport} disabled={notionImporting} className="w-full">
                  {notionImporting ? "가져오는 중..." : "선택한 페이지 가져오기"}
                </Button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              <Link href="/settings" className="text-primary hover:underline">Settings</Link>
              에서 Notion API Key를 설정하면 Notion 페이지에서 경력 데이터를 가져올 수 있습니다.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
