"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";

interface Message {
  role: "interviewer" | "candidate";
  content: string;
}

export default function MockInterviewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const resumeId = searchParams.get("resume_id") || "";

  const [mode, setMode] = useState("normal");
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [started, setStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleStart() {
    if (!resumeId) {
      toast.error("자소서를 선택해주세요.");
      return;
    }
    try {
      const session = await api.post<{ id: string }>(
        "/api/interview/mock/start",
        { resume_id: resumeId, mode }
      );
      setSessionId(session.id);
      setStarted(true);

      // Send initial message to get interviewer's first question
      await sendMessage(session.id, "안녕하세요. 면접 준비가 되었습니다.");
    } catch (e) {
      toast.error("세션 시작 실패: " + (e instanceof Error ? e.message : ""));
    }
  }

  async function sendMessage(sid: string, content: string) {
    setMessages((prev) => [...prev, { role: "candidate", content }]);
    setStreaming(true);
    setInput("");

    let response = "";
    try {
      await api.stream(
        "/api/interview/mock/chat",
        { session_id: sid, content },
        (chunk) => {
          response += chunk;
          setMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg?.role === "interviewer") {
              lastMsg.content = response;
            } else {
              updated.push({ role: "interviewer", content: response });
            }
            return updated;
          });
        }
      );
    } catch (e) {
      toast.error("응답 실패: " + (e instanceof Error ? e.message : ""));
    } finally {
      setStreaming(false);
    }
  }

  async function handleSend() {
    if (!input.trim() || streaming) return;
    await sendMessage(sessionId, input.trim());
  }

  async function handleEnd() {
    try {
      await api.post("/api/interview/mock/end", undefined);
      const evaluation = await api.post<{ session_id: string }>(
        `/api/interview/evaluate/${sessionId}`,
        {}
      );
      toast.success("면접이 종료되었습니다.");
      router.push(`/interview/result/${sessionId}`);
    } catch {
      router.push(`/interview/result/${sessionId}`);
    }
  }

  const MODE_LABEL: Record<string, string> = {
    normal: "일반 면접",
    pressure: "압박 면접",
    pt: "PT 면접",
  };

  if (!started) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">모의면접</h1>
        <Card>
          <CardHeader>
            <CardTitle>면접 모드 선택</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={mode} onValueChange={(v) => v && setMode(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">일반 면접</SelectItem>
                <SelectItem value="pressure">압박 면접</SelectItem>
                <SelectItem value="pt">PT 면접</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleStart} disabled={!resumeId}>
              면접 시작
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">모의면접</h1>
          <Badge>{MODE_LABEL[mode]}</Badge>
        </div>
        <Button variant="destructive" size="sm" onClick={handleEnd}>
          면접 종료
        </Button>
      </div>

      <ScrollArea className="flex-1 border rounded-lg p-4">
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === "candidate" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === "candidate"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-xs font-medium mb-1">
                  {msg.role === "candidate" ? "나" : "면접관"}
                </p>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="flex gap-2 mt-4">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="답변을 입력하세요..."
          disabled={streaming}
        />
        <Button onClick={handleSend} disabled={streaming || !input.trim()}>
          전송
        </Button>
      </div>
    </div>
  );
}
