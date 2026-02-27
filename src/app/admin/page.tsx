import { redirect } from "next/navigation";

import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AppShell } from "@/components/layout/AppShell";
import { auth } from "@/lib/auth";

type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string;
  plan?: string;
};

export default async function AdminPage() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "admin") {
    redirect("/");
  }

  return (
    <AppShell
      title="Admin"
      subtitle="Monitor worker health and manage users, sources, and invite codes."
      userName={user.name}
      userEmail={user.email}
      userRole={user.role}
    >
      <AdminDashboard />
    </AppShell>
  );
}
