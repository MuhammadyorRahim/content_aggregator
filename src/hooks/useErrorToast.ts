"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function useErrorToast(error: unknown, fallback = "Something went wrong") {
  const lastMessageRef = useRef<string | null>(null);

  useEffect(() => {
    if (!error) {
      lastMessageRef.current = null;
      return;
    }

    const message = error instanceof Error ? error.message : fallback;

    if (lastMessageRef.current === message) {
      return;
    }

    lastMessageRef.current = message;
    toast.error(message);
  }, [error, fallback]);
}
