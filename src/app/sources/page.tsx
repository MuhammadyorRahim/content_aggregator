import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { SourcesManager } from "@/components/sources/SourcesManager";
import { auth } from "@/lib/auth";

type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string;
  plan?: string;
};

export default async function SourcesPage() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell
      title="Sources"
      subtitle="Manage your subscriptions, mute noisy channels, and keep feed quality high."
      userName={user.name}
      userEmail={user.email}
      userRole={user.role}
    >
      <SourcesManager />
    </AppShell>
  );
}
