"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Link2, ToggleLeft, Palette, Info, Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

// ── Types ──

interface ProviderConfig {
  enabled: boolean;
  auth_mode: string;
  api_key: string;
  credentials_path: string;
  api_key_masked?: string;
  has_key?: boolean;
}

interface SettingsData {
  llm: {
    claude: ProviderConfig;
    openai: ProviderConfig;
    brave_api_key: string;
    brave_search_enabled: boolean;
    brave_api_key_masked?: string;
    has_brave_key?: boolean;
  };
  supabase: {
    url: string;
    anon_key: string;
    service_role_key: string;
    has_url?: boolean;
    has_anon_key?: boolean;
    has_service_key?: boolean;
    url_display?: string;
    anon_key_masked?: string;
    service_key_masked?: string;
  };
  features: Record<string, boolean>;
}

interface ServiceStatus {
  status: string;
  message: string;
}

interface ConnectionStatus {
  claude: ServiceStatus;
  openai: ServiceStatus;
  supabase: ServiceStatus;
  brave: ServiceStatus;
}

const STATUS_STYLES: Record<string, { dot: string; label: string }> = {
  valid: { dot: "bg-green-500", label: "연결됨" },
  partial: { dot: "bg-yellow-500", label: "일부" },
  expired: { dot: "bg-yellow-500", label: "만료" },
  missing: { dot: "bg-red-500", label: "미설정" },
  error: { dot: "bg-red-500", label: "오류" },
  disabled: { dot: "bg-gray-400", label: "비활성" },
};

const FEATURE_LABELS: Record<string, string> = {
  resume_generation: "자소서 생성",
  feedback_analysis: "첨삭 분석",
  mock_interview: "모의면접",
  question_generation: "예상질문 생성",
  company_analysis: "기업 분석",
  file_parsing: "파일 파싱",
  embedding: "벡터 임베딩",
  docx_export: "DOCX 내보내기",
  research_import: "리서치 가져오기",
};

const SIDEBAR_ITEMS = [
  { id: "connections", label: "연결", icon: Link2 },
  { id: "features", label: "기능", icon: ToggleLeft },
  { id: "theme", label: "테마", icon: Palette },
  { id: "info", label: "정보", icon: Info },
] as const;

type TabId = (typeof SIDEBAR_ITEMS)[number]["id"];

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("connections");

  const [claudeKey, setClaudeKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [braveKey, setBraveKey] = useState("");
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [supabaseServiceKey, setSupabaseServiceKey] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [s, st] = await Promise.all([
        api.get<SettingsData>("/api/settings"),
        api.get<ConnectionStatus>("/api/settings/status"),
      ]);
      setSettings(s);
      setStatus(st);
      setSupabaseUrl(s.supabase.url_display || s.supabase.url || "");
    } catch {
      toast.error("설정을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        llm: {
          claude: {
            enabled: settings.llm.claude.enabled,
            auth_mode: settings.llm.claude.auth_mode,
            credentials_path: settings.llm.claude.credentials_path,
            ...(claudeKey ? { api_key: claudeKey } : {}),
          },
          openai: {
            enabled: settings.llm.openai.enabled,
            auth_mode: settings.llm.openai.auth_mode,
            credentials_path: settings.llm.openai.credentials_path,
            ...(openaiKey ? { api_key: openaiKey } : {}),
          },
          brave_search_enabled: settings.llm.brave_search_enabled,
          ...(braveKey ? { brave_api_key: braveKey } : {}),
        },
        supabase: {
          url: supabaseUrl || undefined,
          ...(supabaseAnonKey ? { anon_key: supabaseAnonKey } : {}),
          ...(supabaseServiceKey ? { service_role_key: supabaseServiceKey } : {}),
        },
        features: settings.features,
      };
      const updated = await api.put<SettingsData>("/api/settings", payload);
      setSettings(updated);
      setClaudeKey("");
      setOpenaiKey("");
      setBraveKey("");
      setSupabaseAnonKey("");
      setSupabaseServiceKey("");
      setSupabaseUrl(updated.supabase.url_display || updated.supabase.url || "");
      const st = await api.get<ConnectionStatus>("/api/settings/status");
      setStatus(st);
      toast.success("설정이 저장되었습니다.");
    } catch (e) {
      toast.error("저장 실패: " + (e instanceof Error ? e.message : ""));
    } finally {
      setSaving(false);
    }
  }

  function updateProvider(provider: "claude" | "openai", field: string, value: string | boolean) {
    if (!settings) return;
    setSettings({
      ...settings,
      llm: { ...settings.llm, [provider]: { ...settings.llm[provider], [field]: value } },
    });
  }

  function toggleFeature(key: string) {
    if (!settings) return;
    setSettings({
      ...settings,
      features: { ...settings.features, [key]: !settings.features[key] },
    });
  }

  if (loading || !settings) {
    return <div className="text-center py-12 text-muted-foreground">로딩 중...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">설정</h1>
        {activeTab !== "theme" && activeTab !== "info" && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "저장 중..." : "설정 저장"}
          </Button>
        )}
      </div>

      <div className="flex gap-6 min-h-[500px]">
        {/* Sidebar */}
        <nav className="w-44 shrink-0 space-y-1">
          {SIDEBAR_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-all text-left",
                activeTab === id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === "connections" && (
            <ConnectionsTab
              settings={settings}
              status={status}
              claudeKey={claudeKey}
              setClaudeKey={setClaudeKey}
              openaiKey={openaiKey}
              setOpenaiKey={setOpenaiKey}
              braveKey={braveKey}
              setBraveKey={setBraveKey}
              supabaseUrl={supabaseUrl}
              setSupabaseUrl={setSupabaseUrl}
              supabaseAnonKey={supabaseAnonKey}
              setSupabaseAnonKey={setSupabaseAnonKey}
              supabaseServiceKey={supabaseServiceKey}
              setSupabaseServiceKey={setSupabaseServiceKey}
              updateProvider={updateProvider}
              setSettings={setSettings}
            />
          )}
          {activeTab === "features" && (
            <FeaturesTab settings={settings} toggleFeature={toggleFeature} />
          )}
          {activeTab === "theme" && <ThemeTab />}
          {activeTab === "info" && <InfoTab status={status} />}
        </div>
      </div>
    </div>
  );
}

// ── Connections Tab ──

function ConnectionsTab({
  settings, status, claudeKey, setClaudeKey, openaiKey, setOpenaiKey,
  braveKey, setBraveKey, supabaseUrl, setSupabaseUrl,
  supabaseAnonKey, setSupabaseAnonKey, supabaseServiceKey, setSupabaseServiceKey,
  updateProvider, setSettings,
}: {
  settings: SettingsData;
  status: ConnectionStatus | null;
  claudeKey: string; setClaudeKey: (v: string) => void;
  openaiKey: string; setOpenaiKey: (v: string) => void;
  braveKey: string; setBraveKey: (v: string) => void;
  supabaseUrl: string; setSupabaseUrl: (v: string) => void;
  supabaseAnonKey: string; setSupabaseAnonKey: (v: string) => void;
  supabaseServiceKey: string; setSupabaseServiceKey: (v: string) => void;
  updateProvider: (p: "claude" | "openai", f: string, v: string | boolean) => void;
  setSettings: React.Dispatch<React.SetStateAction<SettingsData | null>>;
}) {
  return (
    <div className="space-y-4">
      {/* Claude */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              Claude (Anthropic)
              <StatusDot status={status?.claude} />
            </div>
            <Toggle
              enabled={settings.llm.claude.enabled}
              onToggle={() => updateProvider("claude", "enabled", !settings.llm.claude.enabled)}
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {status?.claude && <StatusMsg status={status.claude} />}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">인증 방식</Label>
              <Select
                value={settings.llm.claude.auth_mode}
                onValueChange={(v) => v && updateProvider("claude", "auth_mode", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cli">Claude Code CLI</SelectItem>
                  <SelectItem value="api_key">API Key</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {settings.llm.claude.auth_mode === "api_key" && (
              <div>
                <Label className="text-xs">
                  API Key
                  {settings.llm.claude.has_key && (
                    <span className="ml-1 text-green-600 dark:text-green-400 text-[10px]">
                      ({settings.llm.claude.api_key_masked})
                    </span>
                  )}
                </Label>
                <Input
                  type="password"
                  value={claudeKey}
                  onChange={(e) => setClaudeKey(e.target.value)}
                  placeholder={settings.llm.claude.has_key ? "변경 시 입력" : "sk-ant-..."}
                  className="font-mono text-xs"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* OpenAI */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              OpenAI
              <StatusDot status={status?.openai} />
            </div>
            <Toggle
              enabled={settings.llm.openai.enabled}
              onToggle={() => updateProvider("openai", "enabled", !settings.llm.openai.enabled)}
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {status?.openai && <StatusMsg status={status.openai} />}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">인증 방식</Label>
              <Select
                value={settings.llm.openai.auth_mode}
                onValueChange={(v) => v && updateProvider("openai", "auth_mode", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="codex_cli">Codex CLI</SelectItem>
                  <SelectItem value="api_key">API Key</SelectItem>
                  <SelectItem value="oauth">OAuth</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {settings.llm.openai.auth_mode === "api_key" && (
              <div>
                <Label className="text-xs">
                  API Key
                  {settings.llm.openai.has_key && (
                    <span className="ml-1 text-green-600 dark:text-green-400 text-[10px]">
                      ({settings.llm.openai.api_key_masked})
                    </span>
                  )}
                </Label>
                <Input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder={settings.llm.openai.has_key ? "변경 시 입력" : "sk-..."}
                  className="font-mono text-xs"
                />
              </div>
            )}
            {settings.llm.openai.auth_mode === "oauth" && (
              <div>
                <Label className="text-xs">Credentials 경로</Label>
                <Input
                  value={settings.llm.openai.credentials_path}
                  onChange={(e) => updateProvider("openai", "credentials_path", e.target.value)}
                  placeholder="~/.openai/.credentials.json"
                  className="font-mono text-xs"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Supabase */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            Supabase
            <StatusDot status={status?.supabase} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {status?.supabase && <StatusMsg status={status.supabase} />}
          <div>
            <Label className="text-xs">URL</Label>
            <Input
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://xxx.supabase.co"
              className="font-mono text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">
                Anon Key
                {settings.supabase.has_anon_key && (
                  <span className="ml-1 text-green-600 dark:text-green-400 text-[10px]">설정됨</span>
                )}
              </Label>
              <Input
                type="password"
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                placeholder={settings.supabase.has_anon_key ? "변경 시 입력" : "eyJ..."}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">
                Service Role Key
                {settings.supabase.has_service_key && (
                  <span className="ml-1 text-green-600 dark:text-green-400 text-[10px]">설정됨</span>
                )}
              </Label>
              <Input
                type="password"
                value={supabaseServiceKey}
                onChange={(e) => setSupabaseServiceKey(e.target.value)}
                placeholder={settings.supabase.has_service_key ? "변경 시 입력" : "eyJ..."}
                className="font-mono text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brave */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              Brave Search
              <StatusDot status={status?.brave} />
            </div>
            <Toggle
              enabled={settings.llm.brave_search_enabled}
              onToggle={() =>
                setSettings((s) => s ? ({
                  ...s,
                  llm: { ...s.llm, brave_search_enabled: !s.llm.brave_search_enabled },
                }) : s)
              }
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label className="text-xs">
              API Key
              {settings.llm.has_brave_key && (
                <span className="ml-1 text-green-600 dark:text-green-400 text-[10px]">설정됨</span>
              )}
            </Label>
            <Input
              type="password"
              value={braveKey}
              onChange={(e) => setBraveKey(e.target.value)}
              placeholder={settings.llm.has_brave_key ? "변경 시 입력" : "BSA..."}
              className="font-mono text-xs"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Features Tab ──

function FeaturesTab({
  settings,
  toggleFeature,
}: {
  settings: SettingsData;
  toggleFeature: (key: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        각 기능을 개별적으로 켜고 끌 수 있습니다.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {Object.keys(settings.features).map((key) => (
          <div
            key={key}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <span className="text-sm">{FEATURE_LABELS[key] || key}</span>
            <Toggle enabled={settings.features[key]} onToggle={() => toggleFeature(key)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Theme Tab ──

function ThemeTab() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const options = [
    { value: "light", label: "라이트", icon: Sun, desc: "밝은 배경" },
    { value: "dark", label: "다크", icon: Moon, desc: "어두운 배경" },
    { value: "system", label: "시스템", icon: Monitor, desc: "OS 설정 따르기" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">앱의 외관을 선택하세요.</p>
      <div className="grid grid-cols-3 gap-3">
        {options.map(({ value, label, icon: Icon, desc }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
              theme === value
                ? "border-primary bg-primary/5"
                : "border-transparent bg-muted/50 hover:border-muted-foreground/20"
            )}
          >
            <Icon className={cn("h-6 w-6", theme === value ? "text-primary" : "text-muted-foreground")} />
            <span className="text-sm font-medium">{label}</span>
            <span className="text-xs text-muted-foreground">{desc}</span>
          </button>
        ))}
      </div>

      {/* Color preview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">색상 미리보기</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {["bg-primary", "bg-secondary", "bg-accent", "bg-muted", "bg-destructive"].map((c) => (
              <div key={c} className={cn("w-10 h-10 rounded-lg", c)} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Info Tab ──

function InfoTab({ status }: { status: ConnectionStatus | null }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">CareerLab</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">버전</span>
            <span>0.1.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">프레임워크</span>
            <span>Next.js 15 + FastAPI</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">데이터베이스</span>
            <span>Supabase (pgvector)</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">연결 상태 요약</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {status &&
            Object.entries(status).map(([key, st]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="capitalize">{key}</span>
                <StatusDot status={st} />
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Shared Components ──

function StatusDot({ status }: { status?: ServiceStatus }) {
  const key = status?.status || "disabled";
  const style = STATUS_STYLES[key] || STATUS_STYLES.disabled;
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("inline-block w-2 h-2 rounded-full", style.dot)} />
      <span className="text-xs text-muted-foreground">{style.label}</span>
    </div>
  );
}

function StatusMsg({ status }: { status: ServiceStatus }) {
  const colors =
    status.status === "valid"
      ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"
      : status.status === "missing" || status.status === "error"
        ? "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
        : "bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200";
  return <p className={cn("text-xs p-2 rounded", colors)}>{status.message}</p>;
}

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
        enabled ? "bg-primary" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform",
          enabled ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}
