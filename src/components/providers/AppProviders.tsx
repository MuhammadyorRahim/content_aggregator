"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProgressBar } from "next-nprogress-bar";
import { SessionProvider } from "next-auth/react";
import { useState, type ReactNode } from "react";

import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ThemeProvider>
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          <AppProgressBar color="hsl(var(--primary))" height="3px" options={{ showSpinner: false }} shallowRouting />
          {children}
          <Toaster richColors />
        </QueryClientProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
