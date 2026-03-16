"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { CalendarEvent } from "@/lib/types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const rows: (number | null)[][] = [];
  let currentRow: (number | null)[] = [];

  for (let i = 0; i < firstDay; i++) {
    currentRow.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    currentRow.push(day);
    if (currentRow.length === 7) {
      rows.push(currentRow);
      currentRow = [];
    }
  }

  if (currentRow.length > 0) {
    while (currentRow.length < 7) {
      currentRow.push(null);
    }
    rows.push(currentRow);
  }

  return rows;
}

export default function CalendarPage() {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());

  useEffect(() => {
    api
      .get<CalendarEvent[]>("/api/applications/calendar")
      .then(setEvents)
      .catch(() => toast.error("캘린더 이벤트를 불러오지 못했습니다"))
      .finally(() => setLoading(false));
  }, []);

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  const grid = getMonthGrid(year, month);
  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  function getEventsForDay(day: number): CalendarEvent[] {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => e.date === dateStr);
  }

  function handleEventClick(event: CalendarEvent) {
    router.push(`/applications/${event.id}`);
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/applications">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">캘린더</h1>
      </div>

      <Card className="glass-card">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-base">
              {year}년 {month + 1}월
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          {/* Weekday Header */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((wd, i) => (
              <div
                key={wd}
                className={cn(
                  "text-center text-xs font-medium py-1",
                  i === 0 && "text-red-400",
                  i === 6 && "text-blue-400",
                  i > 0 && i < 6 && "text-muted-foreground"
                )}
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-px bg-border/50 rounded-lg overflow-hidden">
            {grid.flatMap((row, ri) =>
              row.map((day, ci) => {
                const dayEvents = day ? getEventsForDay(day) : [];
                const dayOfWeek = ci;
                return (
                  <div
                    key={`${ri}-${ci}`}
                    className={cn(
                      "min-h-[64px] md:min-h-[80px] p-1 bg-background",
                      !day && "bg-muted/30"
                    )}
                  >
                    {day && (
                      <>
                        <span
                          className={cn(
                            "inline-flex items-center justify-center w-6 h-6 text-xs rounded-full",
                            isToday(day) && "bg-primary text-primary-foreground font-bold",
                            !isToday(day) && dayOfWeek === 0 && "text-red-400",
                            !isToday(day) && dayOfWeek === 6 && "text-blue-400",
                            !isToday(day) && dayOfWeek > 0 && dayOfWeek < 6 && "text-foreground"
                          )}
                        >
                          {day}
                        </span>
                        <div className="mt-0.5 space-y-0.5">
                          {dayEvents.map((evt) => (
                            <button
                              key={`${evt.id}-${evt.type}`}
                              onClick={() => handleEventClick(evt)}
                              className={cn(
                                "w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded truncate transition-colors",
                                evt.type === "deadline"
                                  ? "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
                                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
                              )}
                            >
                              <span
                                className={cn(
                                  "inline-block w-1.5 h-1.5 rounded-full mr-0.5",
                                  evt.type === "deadline" ? "bg-red-500" : "bg-blue-500"
                                )}
                              />
                              {evt.company_name}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              마감일
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              면접일
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
