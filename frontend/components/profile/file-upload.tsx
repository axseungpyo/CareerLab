"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";

interface FileUploadProps {
  onParsed: (data: Record<string, unknown>) => void;
}

export default function FileUpload({ onParsed }: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = useCallback(
    async (file: File) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "pdf" && ext !== "docx") {
        setError("PDF 또는 DOCX 파일만 지원합니다.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const result = await api.upload<Record<string, unknown>>(
          "/api/profile/upload",
          file
        );
        onParsed(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "업로드 실패");
      } finally {
        setLoading(false);
      }
    },
    [onParsed]
  );

  return (
    <Card
      className={`border-2 border-dashed transition-colors ${
        dragging ? "border-primary bg-primary/5" : "border-muted"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
    >
      <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
        <p className="text-sm text-muted-foreground">
          {loading ? "파싱 중..." : "이력서 파일을 드래그하거나 클릭하여 업로드"}
        </p>
        <p className="text-xs text-muted-foreground">PDF, DOCX 지원</p>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".pdf,.docx";
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleFile(file);
            };
            input.click();
          }}
        >
          파일 선택
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
