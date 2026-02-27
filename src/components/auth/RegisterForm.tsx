"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn as signInWithProvider } from "next-auth/react";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RegisterFormProps = {
  registrationMode?: "open" | "invite-only";
  googleEnabled?: boolean;
};

export function RegisterForm({ registrationMode = "open", googleEnabled = false }: RegisterFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const inviteCodeRequired = registrationMode === "invite-only";
  const showGoogleSignup = googleEnabled && registrationMode === "open";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      ...(inviteCodeRequired ? { inviteCode: String(formData.get("inviteCode") ?? "") || undefined } : {}),
    };

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await response.json();
    setLoading(false);

    if (!response.ok || !json.success) {
      setError(json.error ?? "Registration failed");
      return;
    }

    setMessage(json.data?.message ?? "Account created.");
    setTimeout(() => {
      router.push("/login");
    }, 1200);
  }

  async function onGoogleSignUp() {
    setGoogleLoading(true);
    setError(null);

    try {
      await signInWithProvider("google", { callbackUrl: "/" });
    } catch {
      setError("Google signup failed");
      setGoogleLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>
          {inviteCodeRequired
            ? "Register with your email, password, and a valid invite code."
            : "Register with your email and password."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
            <p className="text-xs text-muted-foreground">At least 8 characters with one letter and one number.</p>
          </div>
          {inviteCodeRequired ? (
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Invite code</Label>
              <Input id="inviteCode" name="inviteCode" required />
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-green-600">{message}</p> : null}

          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>

        {showGoogleSignup ? (
          <>
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onGoogleSignUp}
              disabled={googleLoading}
            >
              {googleLoading ? "Redirecting..." : "Continue with Google"}
            </Button>
          </>
        ) : null}

        <p className="mt-4 text-sm">
          Already have an account?{" "}
          <Link className="text-blue-600 hover:underline" href="/login">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
