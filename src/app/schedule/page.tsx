import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { ScheduleWorkspace } from "@/components/schedule/ScheduleWorkspace";
import { auth } from "@/lib/auth";

type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string;
  plan?: string;
};

export default async function SchedulePage() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell
      title="Schedule"
      subtitle="Create reminders for important posts and stay consistent."
      userName={user.name}
      userEmail={user.email}
      userRole={user.role}
    >
      <ScheduleWorkspace isPro={user.plan === "pro"} />
    </AppShell>
  );
}
