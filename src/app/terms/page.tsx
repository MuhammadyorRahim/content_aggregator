import Link from "next/link";

import { Button } from "@/components/ui/button";

const sections = [
  {
    title: "Use of service",
    body: "You may use this application for personal and internal workflow purposes. You are responsible for all actions taken through your account.",
  },
  {
    title: "Account security",
    body: "Keep your credentials secure. If you suspect unauthorized access, rotate your password immediately and contact the administrator.",
  },
  {
    title: "Content responsibility",
    body: "You are responsible for source URLs you subscribe to and any downstream usage of fetched content.",
  },
  {
    title: "Service changes",
    body: "Features and pricing may evolve over time. Material changes will be communicated in-app or by email.",
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">Terms of Service</h1>
          <Button variant="outline" asChild>
            <Link href="/">Back</Link>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">Last updated: February 25, 2026</p>

        <div className="space-y-5">
          {sections.map((section) => (
            <section key={section.title} className="rounded-xl border border-border/70 p-4">
              <h2 className="font-semibold">{section.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
