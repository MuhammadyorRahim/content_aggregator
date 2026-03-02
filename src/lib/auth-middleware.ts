import { cookies } from "next/headers";
import { decode } from "next-auth/jwt";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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

const AUTH_SECRET = process.env.AUTH_SECRET!;
const COOKIE_NAME = process.env.NODE_ENV === "production"
  ? (process.env.AUTH_URL?.startsWith("https") ? "__Secure-authjs.session-token" : "authjs.session-token")
  : "authjs.session-token";

/**
 * Fallback session reader: manually reads the JWT cookie and decodes it.
 * Works around next-auth v5 beta incompatibility with Next.js 16's async cookies().
 */
async function getSessionFromCookie(): Promise<AuthSession | null> {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(COOKIE_NAME);
    if (!tokenCookie?.value) return null;

    const token = await decode({
      token: tokenCookie.value,
      secret: AUTH_SECRET,
      salt: COOKIE_NAME,
    });

    if (!token?.sub) return null;

    const dbUser = await db.user.findUnique({
      where: { id: token.sub },
      select: { id: true, email: true, name: true, role: true, plan: true },
    });

    if (!dbUser) return null;

    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        plan: dbUser.plan,
      },
    };
  } catch (error) {
    console.error("[auth] cookie fallback decode failed:", error);
    return null;
  }
}

export async function requireAuth(): Promise<AuthSession> {
  // Try the standard next-auth auth() first
  const session = (await auth()) as { user?: AuthUser } | null;

  if (session?.user) {
    return { user: session.user };
  }

  // Fallback: manually decode JWT cookie (Next.js 16 + next-auth v5 beta compat)
  const fallback = await getSessionFromCookie();
  if (fallback) {
    return fallback;
  }

  throw new Error("UNAUTHORIZED");
}

export async function requireAdmin(): Promise<AuthSession> {
  const session = await requireAuth();
  const role = session.user.role;

  if (role !== "admin") {
    throw new Error("FORBIDDEN");
  }

  return session;
}
