import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { auth } from "@/lib/auth";

type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string;
  plan?: string;
};

export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell
      title="Settings"
      subtitle="Manage profile, security, and data preferences."
      userName={user.name}
      userEmail={user.email}
      userRole={user.role}
    >
      <SettingsPanel />
    </AppShell>
  );
}
