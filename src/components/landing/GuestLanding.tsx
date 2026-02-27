import { ArrowRight, CheckCircle2, Sparkles, Zap } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const featureCards = [
  {
    title: "One private feed",
    description: "Combine X, YouTube, Substack, Telegram, and websites into one focused stream.",
    icon: Sparkles,
  },
  {
    title: "Smart filtering",
    description: "Track read/saved state and discover signal faster with scoped search and categories.",
    icon: Zap,
  },
  {
    title: "Built for ownership",
    description: "Your data, your subscriptions, your schedule. Export anytime from settings.",
    icon: CheckCircle2,
  },
];

export function GuestLanding() {
  return (
    <div className="min-h-screen bg-[linear-gradient(130deg,hsl(var(--chart-2)/0.16),transparent_40%),linear-gradient(300deg,hsl(var(--primary)/0.13),transparent_40%)]">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="text-sm font-semibold tracking-[0.2em] text-muted-foreground uppercase">Content Aggregator</div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Create account</Link>
            </Button>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 py-12 md:grid-cols-[1.2fr_1fr]">
          <div className="space-y-6">
            <p className="inline-flex items-center rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs text-muted-foreground">
              Multi-user private content hub
            </p>

            <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Follow what matters, skip platform noise.
            </h1>

            <p className="max-w-xl text-base text-muted-foreground md:text-lg">
              Build your personal stream from trusted sources. Review posts quickly, save what matters, and schedule
              follow-ups without context switching.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/register">
                  Start free
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/pricing">See plans</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            {featureCards.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm backdrop-blur-sm">
                  <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <h2 className="text-lg font-semibold">{feature.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          <p>Built for private research workflows.</p>
          <div className="flex items-center gap-3">
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
