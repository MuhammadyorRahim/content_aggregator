import { FeedWorkspace } from "@/components/feed/FeedWorkspace";
import { GuestLanding } from "@/components/landing/GuestLanding";
import { AppShell } from "@/components/layout/AppShell";
import { auth } from "@/lib/auth";

type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string;
  plan?: string;
};

export default async function Home() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  if (!user) {
    return <GuestLanding />;
  }

  return (
    <AppShell
      title="Feed"
      subtitle="Your personalized stream across all subscribed sources."
      userName={user.name}
      userEmail={user.email}
      userRole={user.role}
    >
      <FeedWorkspace />
    </AppShell>
  );
}
