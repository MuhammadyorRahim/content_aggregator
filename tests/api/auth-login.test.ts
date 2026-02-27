import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/auth/login/route";

const { signInMock, AuthErrorMock } = vi.hoisted(() => ({
  signInMock: vi.fn(),
  AuthErrorMock: class AuthError extends Error {},
}));

vi.mock("@/lib/auth", () => ({
  signIn: signInMock,
}));

vi.mock("next-auth", () => ({
  AuthError: AuthErrorMock,
}));

describe("login route", () => {
  beforeEach(() => {
    signInMock.mockReset();
  });

  it("rejects invalid payloads", async () => {
    const response = await login(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "not-an-email", password: "" }),
      })
    );

    const payload = (await response.json()) as { success: boolean };
    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("calls next-auth signIn for valid credentials", async () => {
    signInMock.mockResolvedValue(undefined);

    const response = await login(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", password: "Password123" }),
      })
    );

    const payload = (await response.json()) as { success: boolean };
    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "user@example.com",
      password: "Password123",
      redirect: false,
    });
  });

  it("maps auth errors to 401", async () => {
    const authError = new AuthErrorMock("Auth failed");
    signInMock.mockRejectedValue(authError);

    const response = await login(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", password: "Password123" }),
      })
    );

    const payload = (await response.json()) as { success: boolean; error?: string };
    expect(response.status).toBe(401);
    expect(payload.success).toBe(false);
    expect(payload.error).toBe("Invalid email or password");
  });
});
