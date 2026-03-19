"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateSelectProps {
  value: string;                    // "YYYY-MM" or "YYYY-MM-DD"
  onChange: (value: string) => void;
  mode?: "month" | "date";         // month: 년-월, date: 년-월-일
  yearRange?: [number, number];    // [start, end]
  placeholder?: string;
  className?: string;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1).padStart(2, "0"),
  label: `${i + 1}월`,
}));

const DAYS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1).padStart(2, "0"),
  label: `${i + 1}일`,
}));

export default function DateSelect({
  value,
  onChange,
  mode = "month",
  yearRange,
  placeholder = "선택",
  className,
}: DateSelectProps) {
  const currentYear = new Date().getFullYear();
  const [startYear, endYear] = yearRange || [currentYear - 30, currentYear + 5];

  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => {
    const y = endYear - i;
    return { value: String(y), label: `${y}년` };
  });

  const parts = value ? value.split("-") : [];
  const year = parts[0] || "";
  const month = parts[1] || "";
  const day = parts[2] || "";

  function buildValue(y: string, m: string, d: string) {
    if (!y) return "";
    if (mode === "month") return m ? `${y}-${m}` : y;
    return m && d ? `${y}-${m}-${d}` : m ? `${y}-${m}` : y;
  }

  return (
    <div className={`flex gap-1.5 ${className || ""}`}>
      <Select value={year} onValueChange={(v) => onChange(buildValue(v || "", month, day))}>
        <SelectTrigger className="text-sm h-9 flex-1 min-w-[80px]">
          <SelectValue placeholder={placeholder === "선택" ? "년도" : placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {years.map((y) => (
            <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={month} onValueChange={(v) => onChange(buildValue(year || String(currentYear), v || "", day))} disabled={!year}>
        <SelectTrigger className="text-sm h-9 w-[72px]">
          <SelectValue placeholder="월" />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((m) => (
            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {mode === "date" && (
        <Select value={day} onValueChange={(v) => onChange(buildValue(year || String(currentYear), month || "01", v || ""))} disabled={!month}>
          <SelectTrigger className="text-sm h-9 w-[72px]">
            <SelectValue placeholder="일" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {DAYS.map((d) => (
              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
