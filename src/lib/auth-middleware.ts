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
    console.error("[auth] requireAuth failed — session:", JSON.stringify(session));
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
