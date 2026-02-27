"use client";

import { ArrowRight, Lock } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type UpgradePromptProps = {
  title?: string;
  description?: string;
};

export function UpgradePrompt({
  title = "This feature requires Pro",
  description = "Upgrade your plan to unlock scheduling and advanced workflow features.",
}: UpgradePromptProps) {
  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 px-3 py-1 text-xs text-primary">
          <Lock className="size-3.5" />
          Pro feature
        </div>
        <CardTitle className="pt-2">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Pro includes schedule management, faster refresh windows, and expanded control over feed workflows.
      </CardContent>
      <CardFooter>
        <Button asChild>
          <Link href="/pricing">
            Upgrade to Pro
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
