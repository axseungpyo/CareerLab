"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, FileText, Mic, Search, Briefcase, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/theme-toggle";

const NAV_ITEMS = [
  { href: "/", label: "홈", icon: Home },
  { href: "/profile", label: "프로필", icon: User },
  { href: "/resume", label: "자소서", icon: FileText },
  { href: "/interview", label: "면접", icon: Mic },
  { href: "/review", label: "첨삭", icon: Search },
  { href: "/applications", label: "지원관리", icon: Briefcase },
  { href: "/settings", label: "설정", icon: Settings },
];

const MOBILE_NAV = NAV_ITEMS.filter((n) => n.href !== "/settings");

export default function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg hidden md:block">
        <div className="container flex h-14 max-w-5xl items-center justify-between mx-auto px-4">
          <div className="flex items-center">
            <Link
              href="/"
              className="mr-8 font-bold text-lg bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent"
            >
              CareerLab
            </Link>
            <nav className="flex items-center gap-1">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const isActive =
                  href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "relative flex items-center gap-2 px-3.5 py-2 text-sm rounded-lg transition-all",
                      isActive
                        ? "text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                    {isActive && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Mobile Top Bar */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg md:hidden">
        <div className="flex h-12 items-center justify-between px-4">
          <Link
            href="/"
            className="font-bold text-lg bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent"
          >
            CareerLab
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/settings" className="p-2 text-muted-foreground hover:text-foreground">
              <Settings className="h-4 w-4" />
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/90 backdrop-blur-lg md:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-14 px-2">
          {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors min-w-[48px]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_4px_oklch(0.55_0.22_270)]")} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
