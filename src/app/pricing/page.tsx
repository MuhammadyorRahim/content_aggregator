import Link from "next/link";

import { PricingPlans } from "@/components/billing/PricingPlans";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";

type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string;
  plan?: string;
};

export default async function PricingPage() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  const content = (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Choose your plan</h1>
        <p className="text-sm text-muted-foreground">
          Start with free, upgrade anytime when you need advanced scheduling and faster refresh.
        </p>
      </div>
      <PricingPlans isAuthenticated={Boolean(user)} currentPlan={user?.plan} />
    </div>
  );

  if (user) {
    return (
      <AppShell
        title="Pricing"
        subtitle="Plan management and subscription billing."
        userName={user.name}
        userEmail={user.email}
        userRole={user.role}
      >
        {content}
      </AppShell>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.1),transparent_45%)] px-6 py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" asChild>
            <Link href="/">Back to home</Link>
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Create account</Link>
            </Button>
          </div>
        </div>
        {content}
      </div>
    </main>
  );
}
