import bcrypt from "bcrypt";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as forgotPassword } from "@/app/api/auth/forgot-password/route";
import { POST as registerUser } from "@/app/api/auth/register/route";
import { POST as resetPassword } from "@/app/api/auth/reset-password/route";
import { GET as verifyEmail } from "@/app/api/auth/verify-email/route";
import { db } from "@/lib/db";
import { clearDatabase } from "../helpers/db";

const { sendEmailMock } = vi.hoisted(() => ({
  sendEmailMock: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: sendEmailMock,
}));

async function createUser(email: string) {
  const passwordHash = await bcrypt.hash("Password123", 12);
  return db.user.create({
    data: {
      email,
      passwordHash,
      name: "Fixture User",
    },
  });
}

describe("auth flows", () => {
  beforeEach(async () => {
    sendEmailMock.mockReset();
    await clearDatabase();
  });

  it("registers a user, normalizes email, and creates a verification token", async () => {
    const response = await registerUser(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New User",
          email: "NewUser@Example.com",
          password: "Password123",
        }),
      })
    );

    const payload = (await response.json()) as { success: boolean; error?: string };
    const createdUser = await db.user.findUnique({ where: { email: "newuser@example.com" } });
    const token = await db.verificationToken.findFirst({ where: { identifier: "newuser@example.com" } });

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(createdUser).not.toBeNull();
    expect(createdUser?.emailVerified).toBeNull();
    expect(token).not.toBeNull();
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("verifies email tokens and redirects to login success state", async () => {
    const user = await createUser("verify@example.com");
    const token = "verify-token-123";

    await db.verificationToken.create({
      data: {
        identifier: user.email,
        token,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const response = await verifyEmail(new Request(`http://localhost/api/auth/verify-email?token=${token}`));
    const updatedUser = await db.user.findUnique({ where: { id: user.id } });
    const deletedToken = await db.verificationToken.findUnique({ where: { token } });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login?verified=1");
    expect(updatedUser?.emailVerified).not.toBeNull();
    expect(deletedToken).toBeNull();
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("creates password reset tokens for existing accounts", async () => {
    await createUser("forgot@example.com");

    const response = await forgotPassword(
      new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "forgot@example.com" }),
      })
    );

    const payload = (await response.json()) as { success: boolean; error?: string };
    const resetToken = await db.passwordResetToken.findFirst({ where: { email: "forgot@example.com" } });

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(resetToken).not.toBeNull();
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("resets passwords and invalidates all sessions for the user", async () => {
    const user = await createUser("reset@example.com");
    const token = "reset-token-abc";

    await db.passwordResetToken.create({
      data: {
        email: user.email,
        token,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await db.session.create({
      data: {
        userId: user.id,
        sessionToken: "session-token-to-remove",
        expires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const response = await resetPassword(
      new Request("http://localhost/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword: "NewPassword123",
        }),
      })
    );

    const payload = (await response.json()) as { success: boolean; error?: string };
    const updatedUser = await db.user.findUnique({ where: { id: user.id } });
    const resetToken = await db.passwordResetToken.findUnique({ where: { token } });
    const sessionCount = await db.session.count({ where: { userId: user.id } });

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(updatedUser).not.toBeNull();
    expect(await bcrypt.compare("NewPassword123", updatedUser?.passwordHash ?? "")).toBe(true);
    expect(resetToken).toBeNull();
    expect(sessionCount).toBe(0);
  });
});
