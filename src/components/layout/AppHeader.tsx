"use client";

import { Loader2, Menu, RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useSources, useUnreadDocumentTitle } from "@/hooks";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
};

export function AppHeader({ title, subtitle, userName, userEmail, userRole }: AppHeaderProps) {
  const [open, setOpen] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();
  const sourcesQuery = useSources();
  const unreadTotal = sourcesQuery.sources.reduce((sum, source) => sum + source.unreadCount, 0);

  useUnreadDocumentTitle(unreadTotal);

  function refreshFeed() {
    startRefresh(async () => {
      const response = await fetch("/api/fetch", { method: "POST" });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        toast.error(payload?.error ?? "Failed to start refresh");
        return;
      }

      toast.success("Refresh started");
    });
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-4">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon-sm" className="md:hidden" aria-label="Open menu">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <AppSidebar
                userName={userName}
                userEmail={userEmail}
                userRole={userRole}
                onNavigate={() => setOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <div>
            <h1 className="text-base font-semibold md:text-lg">{title}</h1>
            {subtitle ? <p className="text-xs text-muted-foreground md:text-sm">{subtitle}</p> : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={refreshFeed} disabled={isRefreshing}>
            {isRefreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
