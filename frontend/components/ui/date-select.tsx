"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const parts = value ? value.split("-") : [];
  const year = parts[0] || "";
  const rest = parts.slice(1).join("-"); // "MM" or "MM-DD"

  function handleYearChange(y: string) {
    if (!y) { onChange(""); return; }
    if (rest) {
      onChange(`${y}-${rest}`);
    } else {
      onChange(mode === "month" ? `${y}-01` : `${y}-01-01`);
    }
  }

  function handleInputChange(v: string) {
    onChange(v);
  }

  return (
    <div className={`flex gap-1.5 items-center ${className || ""}`}>
      <Select value={year} onValueChange={(v) => handleYearChange(v || "")} disabled={disabled}>
        <SelectTrigger className="text-sm h-9 w-[90px] shrink-0">
          <SelectValue placeholder={placeholder || "년도"} />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {YEARS.map((y) => (
            <SelectItem key={y} value={String(y)}>{y}년</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type={mode}
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        className="text-sm h-9 flex-1"
        disabled={disabled}
      />
    </div>
  );
}
