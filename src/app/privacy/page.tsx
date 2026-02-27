import Link from "next/link";

import { Button } from "@/components/ui/button";

const sections = [
  {
    title: "Data collected",
    body: "We store account data, subscriptions, post states, and scheduled events needed to operate your personalized feed.",
  },
  {
    title: "How data is used",
    body: "Your data is used only for feed delivery, account management, billing, and service reliability.",
  },
  {
    title: "Data retention",
    body: "Data remains until you delete your account. You can export your data anytime from settings.",
  },
  {
    title: "Third-party services",
    body: "Billing and transactional email rely on external providers. Their own privacy policies apply to those services.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">Privacy Policy</h1>
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
