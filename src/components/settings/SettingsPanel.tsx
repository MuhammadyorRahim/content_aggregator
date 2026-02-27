"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { FormEvent } from "react";
import { toast } from "sonner";

import { FormSkeleton } from "@/components/shared/LoadingStates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useErrorToast } from "@/hooks";

type MeResponse = {
  success: boolean;
  data: {
    id: string;
    email: string;
    emailVerified: string | null;
    name: string | null;
    timezone: string;
    theme: "light" | "dark" | "system";
    role: string;
    plan: string;
    createdAt: string;
    googleConnected?: boolean;
  } | null;
  error?: string;
};

type PasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

type ProfilePayload = {
  name: string;
  email: string;
  timezone: string;
  theme: "light" | "dark" | "system";
};

export function SettingsPanel() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setTheme } = useTheme();

  const meQuery = useQuery({
    queryKey: ["auth-me"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me");
      const payload = (await response.json()) as MeResponse;
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? "Failed to load profile");
      }
      return payload.data;
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: ProfilePayload) => {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !body.success) {
        throw new Error(body.error ?? "Failed to update profile");
      }
    },
    onSuccess: (_, variables) => {
      setTheme(variables.theme);
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
      router.refresh();
    },
    onError: (error) => {
      toast.error((error as Error).message);
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (payload: PasswordPayload) => {
      const response = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !body.success) {
        throw new Error(body.error ?? "Failed to change password");
      }
    },
    onSuccess: () => {
      toast.success("Password changed");
    },
    onError: (error) => {
      toast.error((error as Error).message);
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/me", { method: "DELETE" });
      const payload = (await response.json()) as { success: boolean; error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Failed to delete account");
      }
    },
    onSuccess: () => {
      toast.success("Account deleted");
      router.replace("/");
      router.refresh();
    },
    onError: (error) => {
      toast.error((error as Error).message);
    },
  });

  useErrorToast(meQuery.error, "Unable to load settings");

  function submitProfile(event: FormEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const rawTheme = String(formData.get("theme") ?? "system");
    const nextTheme: ProfilePayload["theme"] =
      rawTheme === "light" || rawTheme === "dark" || rawTheme === "system" ? rawTheme : "system";

    updateProfileMutation.mutate({
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      timezone: String(formData.get("timezone") ?? "UTC").trim(),
      theme: nextTheme,
    });
  }

  function submitPassword(event: FormEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    changePasswordMutation.mutate({
      currentPassword: String(formData.get("currentPassword") ?? ""),
      newPassword: String(formData.get("newPassword") ?? ""),
    }, {
      onSuccess: () => {
        form.reset();
      },
    });
  }

  function deleteAccount() {
    const confirmed = window.confirm("Delete your account permanently? This cannot be undone.");
    if (!confirmed) {
      return;
    }

    deleteAccountMutation.mutate();
  }

  if (meQuery.isPending) {
    return <FormSkeleton />;
  }

  if (meQuery.isError || !meQuery.data) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-destructive">
          {(meQuery.error as Error)?.message || "Unable to load settings"}
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="profile" className="space-y-4">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="data">Data</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <Card>
          <form
            key={`${meQuery.data.email}-${meQuery.data.theme}-${meQuery.data.timezone}-${meQuery.data.name ?? ""}`}
            onSubmit={submitProfile}
          >
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Update public profile and display preferences.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={meQuery.data.name ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={meQuery.data.email} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input id="timezone" name="timezone" defaultValue={meQuery.data.timezone} placeholder="UTC" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <select
                  id="theme"
                  name="theme"
                  defaultValue={meQuery.data.theme}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Google integrations</Label>
                <div className="rounded-lg border border-border/70 bg-card/50 p-3">
                  <p className="text-sm font-medium">
                    {meQuery.data.googleConnected ? "Google account connected" : "Google account not connected"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Connect Google to enable OAuth login and one-way Schedule sync to Google Calendar.
                  </p>
                  {!meQuery.data.googleConnected ? (
                    <Button asChild variant="outline" size="sm" className="mt-3">
                      <Link href="/api/auth/signin/google?callbackUrl=/settings">Connect Google</Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </TabsContent>

      <TabsContent value="security">
        <Card>
          <form onSubmit={submitPassword}>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Set a stronger password for your account.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  name="currentPassword"
                  type="password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  name="newPassword"
                  type="password"
                  required
                />
                <p className="text-xs text-muted-foreground">At least 8 characters with one letter and one number.</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={changePasswordMutation.isPending}>
                {changePasswordMutation.isPending ? "Updating..." : "Change password"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </TabsContent>

      <TabsContent value="data">
        <Card>
          <CardHeader>
            <CardTitle>Data controls</CardTitle>
            <CardDescription>Export your account data or permanently delete your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border/70 p-4">
              <p className="font-medium">Export personal data</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Download your profile, sources, post states, blocked posts, and schedule as JSON.
              </p>
              <Button asChild variant="outline" className="mt-3">
                <a href="/api/auth/export" target="_blank" rel="noreferrer">
                  <Download className="size-4" />
                  Export data
                </a>
              </Button>
            </div>

            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="font-medium text-destructive">Delete account</p>
              <p className="mt-1 text-sm text-muted-foreground">
                This action removes your account and cannot be undone.
              </p>
              <Button
                type="button"
                variant="destructive"
                className="mt-3"
                onClick={deleteAccount}
                disabled={deleteAccountMutation.isPending}
              >
                <Trash2 className="size-4" />
                {deleteAccountMutation.isPending ? "Deleting..." : "Delete account"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
