"use client";

import { Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type PricingPlansProps = {
  isAuthenticated: boolean;
  currentPlan?: string;
};

const freeFeatures = [
  "Global source subscriptions",
  "Core feed with read/saved states",
  "Category filters and search",
  "5 manual refreshes per hour",
];

const proFeatures = [
  "Everything in Free",
  "Schedule events and reminders",
  "Faster cache refresh windows",
  "20 manual refreshes per hour",
];

export function PricingPlans({ isAuthenticated, currentPlan }: PricingPlansProps) {
  const [isCheckoutPending, startCheckout] = useTransition();
  const [isPortalPending, startPortal] = useTransition();

  function checkout() {
    startCheckout(async () => {
      const response = await fetch("/api/billing/checkout", { method: "POST" });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success || !payload?.data?.checkoutUrl) {
        toast.error(payload?.error ?? "Unable to start checkout");
        return;
      }

      window.location.href = payload.data.checkoutUrl;
    });
  }

  function openPortal() {
    startPortal(async () => {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success || !payload?.data?.portalUrl) {
        toast.error(payload?.error ?? "Unable to open billing portal");
        return;
      }

      window.location.href = payload.data.portalUrl;
    });
  }

  const isPro = currentPlan === "pro";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Free</CardTitle>
          <p className="text-3xl font-semibold">$0</p>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {freeFeatures.map((feature) => (
            <div key={feature} className="flex items-center gap-2">
              <Check className="size-4 text-primary" />
              {feature}
            </div>
          ))}
        </CardContent>
        <CardFooter>
          {!isAuthenticated ? (
            <Button variant="outline" asChild className="w-full">
              <Link href="/register">Create free account</Link>
            </Button>
          ) : (
            <Button variant="outline" className="w-full" disabled>
              {isPro ? "Current plan: Pro" : "Current plan: Free"}
            </Button>
          )}
        </CardFooter>
      </Card>

      <Card className="border-primary/40 bg-primary/5">
        <CardHeader>
          <CardTitle>Pro</CardTitle>
          <p className="text-3xl font-semibold">$9<span className="text-base font-normal">/month</span></p>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {proFeatures.map((feature) => (
            <div key={feature} className="flex items-center gap-2">
              <Check className="size-4 text-primary" />
              {feature}
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex gap-2">
          {!isAuthenticated ? (
            <Button className="w-full" asChild>
              <Link href="/login">Sign in to upgrade</Link>
            </Button>
          ) : isPro ? (
            <Button className="w-full" onClick={openPortal} disabled={isPortalPending}>
              {isPortalPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Manage billing
            </Button>
          ) : (
            <Button className="w-full" onClick={checkout} disabled={isCheckoutPending}>
              {isCheckoutPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Upgrade to Pro
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
