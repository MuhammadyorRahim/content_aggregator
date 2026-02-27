import { redirect } from "next/navigation";
import { ReactNode } from "react";

import { auth } from "@/lib/auth";

type AuthGuardProps = {
  children: ReactNode;
};

export async function AuthGuard({ children }: AuthGuardProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return <>{children}</>;
}
