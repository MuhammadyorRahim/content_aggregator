import { db } from "@/lib/db";

export const PLAN_LIMITS = {
  free: {
    maxSources: 5,
    searchLookbackDays: 30,
    scheduleEnabled: false,
    manualRefreshPerHour: 5,
  },
  pro: {
    maxSources: null,
    searchLookbackDays: null,
    scheduleEnabled: true,
    manualRefreshPerHour: 20,
  },
} as const;

export type UserPlan = keyof typeof PLAN_LIMITS;
export type PlanLimits = (typeof PLAN_LIMITS)[UserPlan];

function assertKnownPlan(plan: string): UserPlan {
  if (plan === "pro") {
    return "pro";
  }
  return "free";
}

export async function getUserPlan(userId: string): Promise<UserPlan> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  return assertKnownPlan(user?.plan ?? "free");
}

export async function getUserPlanLimits(userId: string): Promise<PlanLimits> {
  const plan = await getUserPlan(userId);
  return PLAN_LIMITS[plan];
}

export async function hasProPlan(userId: string) {
  const plan = await getUserPlan(userId);
  return plan === "pro";
}

export async function requireProPlan(userId: string) {
  const pro = await hasProPlan(userId);
  if (!pro) {
    throw new Error("PLAN_REQUIRED");
  }
}

export async function requireSourceCapacity(userId: string) {
  const limits = await getUserPlanLimits(userId);
  if (limits.maxSources === null) {
    return;
  }

  const sourceCount = await db.userSource.count({ where: { userId } });
  if (sourceCount >= limits.maxSources) {
    throw new Error("SOURCE_LIMIT_REACHED");
  }
}

export async function getSearchLookbackFloor(userId: string) {
  const limits = await getUserPlanLimits(userId);
  if (limits.searchLookbackDays === null) {
    return null;
  }

  return new Date(Date.now() - limits.searchLookbackDays * 24 * 60 * 60 * 1000);
}

type RefreshAllowance = {
  remaining: number;
  resetAt: Date;
};

export async function requireManualRefreshAllowance(userId: string): Promise<RefreshAllowance> {
  const limits = await getUserPlanLimits(userId);
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const refreshCount = await db.manualRefreshEvent.count({
    where: {
      userId,
      createdAt: {
        gte: oneHourAgo,
      },
    },
  });

  if (refreshCount >= limits.manualRefreshPerHour) {
    throw new Error("MANUAL_REFRESH_LIMIT_REACHED");
  }

  return {
    remaining: Math.max(0, limits.manualRefreshPerHour - refreshCount),
    resetAt: new Date(oneHourAgo.getTime() + 60 * 60 * 1000),
  };
}

export async function recordManualRefresh(userId: string) {
  const now = new Date();
  const pruneBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  await db.$transaction([
    db.manualRefreshEvent.create({
      data: { userId },
    }),
    db.manualRefreshEvent.deleteMany({
      where: {
        userId,
        createdAt: {
          lt: pruneBefore,
        },
      },
    }),
  ]);
}
