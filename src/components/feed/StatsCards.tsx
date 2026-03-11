"use client";

import { CalendarCheck, Newspaper, RadioTower, Tag } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const CIRCUMFERENCE = 2 * Math.PI * 22; // r=22 → ~138.23

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: number | string;
  color: "blue" | "green" | "purple" | "amber";
  /** 0–1 fill ratio for the ring */
  fill: number;
  badge?: string;
};

const colorMap = {
  blue: {
    stroke: "stroke-indigo-400",
    text: "text-indigo-400",
    glow: "bg-indigo-500/10",
    ringBg: "stroke-white/[0.06] dark:stroke-white/[0.06]",
  },
  green: {
    stroke: "stroke-green-400",
    text: "text-green-400",
    glow: "bg-green-500/10",
    ringBg: "stroke-white/[0.06] dark:stroke-white/[0.06]",
  },
  purple: {
    stroke: "stroke-purple-400",
    text: "text-purple-400",
    glow: "bg-purple-500/10",
    ringBg: "stroke-white/[0.06] dark:stroke-white/[0.06]",
  },
  amber: {
    stroke: "stroke-amber-400",
    text: "text-amber-400",
    glow: "bg-amber-500/10",
    ringBg: "stroke-white/[0.06] dark:stroke-white/[0.06]",
  },
};

function StatCard({ icon: Icon, label, value, color, fill, badge }: StatCardProps) {
  const c = colorMap[color];
  const clamped = Math.max(0, Math.min(1, fill));
  const offset = CIRCUMFERENCE * (1 - clamped);

  return (
    <div className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.1] hover:bg-white/[0.05] dark:border-white/[0.06] dark:bg-white/[0.03] dark:hover:border-white/[0.1] dark:hover:bg-white/[0.05]">
      {/* Top edge highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {badge ? (
        <span className="absolute right-2.5 top-2.5 rounded-md border border-amber-400/20 bg-gradient-to-br from-amber-400/20 to-amber-500/20 px-1.5 py-0.5 text-[0.55rem] font-extrabold uppercase tracking-wider text-amber-400">
          {badge}
        </span>
      ) : null}

      {/* Ring indicator */}
      <div className="relative flex-shrink-0">
        {/* Glow */}
        <div className={`absolute -inset-1 rounded-full ${c.glow} blur-sm`} />
        <svg viewBox="0 0 52 52" width={52} height={52} className="relative">
          <circle cx={26} cy={26} r={22} fill="none" strokeWidth={3} className="stroke-foreground/[0.06]" />
          <circle
            cx={26}
            cy={26}
            r={22}
            fill="none"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            className={`${c.stroke} origin-center -rotate-90 transition-[stroke-dashoffset] duration-1000 ease-out`}
          />
        </svg>
        <Icon className={`absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 ${c.text}`} strokeWidth={2.5} />
      </div>

      {/* Text */}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-2xl font-extrabold leading-none tracking-tight">{value}</span>
        <span className="text-[0.73rem] font-medium text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

type StatsCardsProps = {
  sourcesCount: number;
  unreadCount: number;
  categoryCount: number;
  scheduledCount: number | null;
  isPro: boolean;
};

export function StatsCards({ sourcesCount, unreadCount, categoryCount, scheduledCount, isPro }: StatsCardsProps) {
  return (
    <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        icon={RadioTower}
        label="Subscribed Sources"
        value={sourcesCount}
        color="blue"
        fill={Math.min(sourcesCount / 20, 1)}
      />
      <StatCard
        icon={Newspaper}
        label="Unread Posts"
        value={unreadCount}
        color="green"
        fill={Math.min(unreadCount / 100, 1)}
      />
      <StatCard
        icon={Tag}
        label="Categories"
        value={categoryCount}
        color="purple"
        fill={Math.min(categoryCount / 12, 1)}
      />
      <StatCard
        icon={CalendarCheck}
        label="Scheduled Events"
        value={isPro ? (scheduledCount ?? 0) : "Pro"}
        color="amber"
        fill={isPro ? Math.min((scheduledCount ?? 0) / 10, 1) : 0}
        badge={!isPro ? "PRO" : undefined}
      />
    </div>
  );
}
