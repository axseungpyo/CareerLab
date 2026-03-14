"use client";

import { useState, useCallback } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
    <div
      className={cn(
        "relative rounded-xl border-2 border-dashed p-8 transition-all",
        dragging
          ? "border-primary bg-primary/5 scale-[1.01]"
          : "border-muted-foreground/20 hover:border-primary/50"
      )}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
    >
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/30 flex items-center justify-center">
          <Upload className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">
            {loading ? "AI가 이력서를 분석하고 있습니다..." : "이력서 파일을 드래그하거나 클릭하여 업로드"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">PDF, DOCX 지원</p>
        </div>
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
      </div>
    </div>
  );
}
