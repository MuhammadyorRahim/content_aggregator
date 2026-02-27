"use client";

import { Bookmark, CalendarClock, CreditCard, Home, LogOut, Radio, Settings, Shield, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSources } from "@/hooks";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  onNavigate?: () => void;
  className?: string;
};

const baseNavItems = [
  { href: "/", label: "Feed", icon: Home },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/schedule", label: "Schedule", icon: CalendarClock },
  { href: "/sources", label: "Sources", icon: Radio },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/pricing", label: "Pricing", icon: CreditCard },
] as const;

export function AppSidebar({ userName, userEmail, userRole, onNavigate, className }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const sourcesQuery = useSources();
  const navItems =
    userRole === "admin"
      ? [...baseNavItems, { href: "/admin", label: "Admin", icon: SlidersHorizontal }]
      : baseNavItems;
  const unreadTotal = sourcesQuery.sources.reduce((sum, source) => sum + source.unreadCount, 0);

  function signOut() {
    startTransition(async () => {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        toast.error("Failed to log out");
        return;
      }

      onNavigate?.();
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <aside
      className={cn(
        "flex h-full w-full flex-col gap-6 border-r border-border/60 bg-card/60 p-4 backdrop-blur-sm",
        className
      )}
    >
      <div className="space-y-1 rounded-xl border border-border/70 bg-background/90 p-3">
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Content Hub</div>
        <div className="truncate text-sm font-semibold">{userName || "Anonymous User"}</div>
        <div className="truncate text-xs text-muted-foreground">{userEmail || "No email found"}</div>
        <div className="pt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
          Role: {userRole || "user"}
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
              {item.href === "/" && unreadTotal > 0 ? (
                <Badge
                  variant={active ? "secondary" : "outline"}
                  className={cn("ml-auto", active ? "border-primary-foreground/40 text-primary-foreground" : "")}
                >
                  {unreadTotal}
                </Badge>
              ) : null}
            </Link>
          );
        })}

        {userRole === "admin" ? (
          <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-border/70 px-3 py-2 text-xs text-muted-foreground">
            <Shield className="size-3.5" />
            Admin access enabled
          </div>
        ) : null}
      </nav>

      <div className="mt-auto">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start"
          onClick={signOut}
          disabled={isPending}
        >
          <LogOut className="size-4" />
          {isPending ? "Signing out..." : "Sign out"}
        </Button>
      </div>
    </aside>
  );
}
