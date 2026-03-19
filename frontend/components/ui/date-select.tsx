"use client";

import { useState, useRef, useEffect } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

interface DateSelectProps {
  value: string;
  onChange: (value: string) => void;
  mode?: "month" | "date";
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const MONTH_LABELS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const currentYear = new Date().getFullYear();

export default function DateSelect({
  value,
  onChange,
  mode = "month",
  placeholder,
  className,
  disabled,
}: DateSelectProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"month" | "year" | "day">("month");
  const [navYear, setNavYear] = useState(currentYear);
  const [navMonth, setNavMonth] = useState(1);
  const ref = useRef<HTMLDivElement>(null);

  const parts = value ? value.split("-") : [];
  const selYear = parts[0] ? Number(parts[0]) : null;
  const selMonth = parts[1] ? Number(parts[1]) : null;
  const selDay = parts[2] ? Number(parts[2]) : null;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function openPicker() {
    if (disabled) return;
    setNavYear(selYear || currentYear);
    setNavMonth(selMonth || 1);
    setView("month");
    setOpen(true);
  }

  function pickMonth(m: number) {
    const yStr = String(navYear);
    const mStr = String(m).padStart(2, "0");
    if (mode === "month") {
      onChange(`${yStr}-${mStr}`);
      setOpen(false);
    } else {
      setNavMonth(m);
      setView("day");
    }
  }

  function pickDay(d: number) {
    const yStr = String(navYear);
    const mStr = String(navMonth).padStart(2, "0");
    const dStr = String(d).padStart(2, "0");
    onChange(`${yStr}-${mStr}-${dStr}`);
    setOpen(false);
  }

  function daysInMonth(y: number, m: number) {
    return new Date(y, m, 0).getDate();
  }

  // Display text
  let displayText = placeholder || "선택";
  if (selYear && selMonth) {
    displayText = mode === "date" && selDay
      ? `${selYear}.${String(selMonth).padStart(2,"0")}.${String(selDay).padStart(2,"0")}`
      : `${selYear}.${String(selMonth).padStart(2,"0")}`;
  }

  // Year grid: 12 years per page
  const yearPageStart = Math.floor(navYear / 12) * 12;
  const yearGrid = Array.from({ length: 12 }, (_, i) => yearPageStart + i);

  return (
    <div className={`relative ${className || ""}`} ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={openPicker}
        className="flex items-center gap-2 w-full h-9 px-3 rounded-md border bg-background text-sm hover:bg-muted/50 transition-colors disabled:opacity-50 text-left"
      >
        <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className={selYear ? "text-foreground" : "text-muted-foreground"}>{displayText}</span>
      </button>

      {/* Popup */}
      {open && (
        <div className="absolute top-10 left-0 z-50 w-[260px] rounded-lg border bg-background shadow-lg p-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => {
              if (view === "month") setNavYear(navYear - 1);
              else if (view === "year") setNavYear(navYear - 12);
              else if (navMonth === 1) { setNavYear(navYear - 1); setNavMonth(12); }
              else setNavMonth(navMonth - 1);
            }} className="p-1 rounded hover:bg-muted">
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (view === "year") setView("month");
                else if (view === "day") setView("month");
                else setView("year");
              }}
              className="text-sm font-semibold hover:text-primary transition-colors px-2 py-0.5 rounded hover:bg-muted"
            >
              {view === "year" ? `${yearGrid[0]} – ${yearGrid[11]}` :
               view === "day" ? `${navYear}년 ${navMonth}월` :
               `${navYear}년`}
            </button>

            <button type="button" onClick={() => {
              if (view === "month") setNavYear(navYear + 1);
              else if (view === "year") setNavYear(navYear + 12);
              else if (navMonth === 12) { setNavYear(navYear + 1); setNavMonth(1); }
              else setNavMonth(navMonth + 1);
            }} className="p-1 rounded hover:bg-muted">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Year Grid */}
          {view === "year" && (
            <div className="grid grid-cols-3 gap-1.5">
              {yearGrid.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => { setNavYear(y); setView("month"); }}
                  className={`py-2 text-sm rounded-md transition-colors ${
                    y === selYear ? "bg-primary text-primary-foreground" :
                    y === currentYear ? "border border-primary/30 hover:bg-muted" :
                    "hover:bg-muted"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          {/* Month Grid */}
          {view === "month" && (
            <div className="grid grid-cols-3 gap-1.5">
              {MONTH_LABELS.map((label, i) => {
                const m = i + 1;
                const isSelected = navYear === selYear && m === selMonth;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => pickMonth(m)}
                    className={`py-2 text-sm rounded-md transition-colors ${
                      isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Day Grid */}
          {view === "day" && (
            <div className="grid grid-cols-7 gap-1">
              {["일","월","화","수","목","금","토"].map((d) => (
                <span key={d} className="text-center text-[10px] text-muted-foreground py-1">{d}</span>
              ))}
              {/* Empty cells for start day */}
              {Array.from({ length: new Date(navYear, navMonth - 1, 1).getDay() }, (_, i) => (
                <span key={`e${i}`} />
              ))}
              {Array.from({ length: daysInMonth(navYear, navMonth) }, (_, i) => {
                const d = i + 1;
                const isSelected = navYear === selYear && navMonth === selMonth && d === selDay;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => pickDay(d)}
                    className={`py-1.5 text-xs rounded-md transition-colors ${
                      isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
