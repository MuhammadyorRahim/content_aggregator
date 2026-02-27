import Link from "next/link";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/auth/RegisterForm";
import { auth } from "@/lib/auth";
import { REGISTRATION_MODE } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  if (REGISTRATION_MODE === "closed") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Registration closed</CardTitle>
            <CardDescription>New accounts are currently disabled for this workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/login">Back to login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <RegisterForm
        registrationMode={REGISTRATION_MODE === "invite-only" ? "invite-only" : "open"}
        googleEnabled={googleEnabled}
      />
    </div>
  );
}
