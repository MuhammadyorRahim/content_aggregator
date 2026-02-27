"use client";

import { useEffect, useRef } from "react";

export function useUnreadDocumentTitle(unreadCount: number, appName = "Content Aggregator") {
  const initialTitle = useRef<string | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (!initialTitle.current) {
      initialTitle.current = document.title;
    }

    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${appName}`;
      return;
    }

    document.title = initialTitle.current || appName;
  }, [appName, unreadCount]);
}
