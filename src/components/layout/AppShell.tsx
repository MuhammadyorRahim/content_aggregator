import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";

type AppShellProps = {
  title: string;
  subtitle?: string;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  children: ReactNode;
};

export function AppShell({ title, subtitle, userName, userEmail, userRole, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.08),transparent_35%),radial-gradient(circle_at_top_right,hsl(var(--chart-2)/0.08),transparent_35%)] dark:bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_36%),radial-gradient(circle_at_top_right,hsl(var(--chart-2)/0.16),transparent_38%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px]">
        <div className="sticky top-0 hidden h-screen w-72 shrink-0 md:block">
          <AppSidebar userName={userName} userEmail={userEmail} userRole={userRole} />
        </div>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <AppHeader
            title={title}
            subtitle={subtitle}
            userName={userName}
            userEmail={userEmail}
            userRole={userRole}
          />
          <main className="flex-1 px-3 py-4 sm:px-4 md:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
