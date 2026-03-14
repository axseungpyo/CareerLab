"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, FileText, Mic, Search, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/theme-toggle";

const NAV_ITEMS = [
  { href: "/", label: "홈", icon: Home },
  { href: "/profile", label: "프로필", icon: User },
  { href: "/resume", label: "자소서", icon: FileText },
  { href: "/interview", label: "면접", icon: Mic },
  { href: "/review", label: "첨삭", icon: Search },
  { href: "/settings", label: "설정", icon: Settings },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-5xl items-center justify-between mx-auto px-4">
        <div className="flex items-center">
          <Link
            href="/"
            className="mr-6 font-bold text-lg bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent"
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
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all",
                    isActive
                      ? "bg-gradient-to-r from-indigo-500/10 to-violet-500/10 text-indigo-600 dark:text-indigo-400 font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
