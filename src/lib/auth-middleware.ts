import { cookies } from "next/headers";

import { auth } from "@/lib/auth";

type AuthUser = {
  id: string;
  role?: string;
  plan?: string;
  email?: string | null;
  name?: string | null;
};

export type AuthSession = {
  user: AuthUser;
};

export async function requireAuth(): Promise<AuthSession> {
  const session = (await auth()) as { user?: AuthUser } | null;

  if (!session?.user) {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll().map((c) => c.name);
    const hasSession = allCookies.some((n) => n.includes("session-token"));
    console.error(
      "[auth] requireAuth failed — session:", JSON.stringify(session),
      "| cookies:", allCookies.join(", "),
      "| hasSessionToken:", hasSession
    );
    throw new Error("UNAUTHORIZED");
  }

  return { user: session.user };
}

export async function requireAdmin(): Promise<AuthSession> {
  const session = await requireAuth();
  const role = session.user.role;

  if (role !== "admin") {
    throw new Error("FORBIDDEN");
  }

  return session;
}
