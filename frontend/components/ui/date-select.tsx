"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";

interface DateSelectProps {
  value: string;
  onChange: (value: string) => void;
  mode?: "month" | "date";
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 36 }, (_, i) => currentYear + 5 - i);

export default function DateSelect({
  value,
  onChange,
  mode = "month",
  placeholder,
  className,
  disabled,
}: DateSelectProps) {
  const [yearOpen, setYearOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const parts = value ? value.split("-") : [];
  const year = parts[0] || "";
  const rest = parts.slice(1).join("-");

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setYearOpen(false);
      }
    }
    if (yearOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [yearOpen]);

  function selectYear(y: number) {
    const yStr = String(y);
    if (rest) {
      onChange(`${yStr}-${rest}`);
    } else {
      onChange(mode === "month" ? `${yStr}-01` : `${yStr}-01-01`);
    }
    setYearOpen(false);
  }

  return (
    <div className={`flex gap-1.5 items-center ${className || ""}`}>
      {/* 연도 토글 버튼 */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setYearOpen(!yearOpen)}
          className="flex items-center gap-1 h-9 px-3 rounded-md border bg-background text-sm hover:bg-muted transition-colors disabled:opacity-50 shrink-0"
        >
          {year ? `${year}년` : (placeholder || "년도")}
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${yearOpen ? "rotate-180" : ""}`} />
        </button>

        {yearOpen && (
          <div className="absolute top-10 left-0 z-50 w-[100px] max-h-60 overflow-y-auto rounded-md border bg-background shadow-lg py-1">
            {YEARS.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => selectYear(y)}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors ${
                  String(y) === year ? "bg-primary/10 font-medium text-primary" : ""
                }`}
              >
                {y}년
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 네이티브 달력 입력 */}
      <Input
        type={mode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm h-9 flex-1"
        disabled={disabled}
      />
    </div>
  );
}
