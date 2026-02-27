"use client";

import { useCallback, useEffect, useRef } from "react";

type UseReadTrackerOptions = {
  onRead: (postId: string) => void;
  enabled?: boolean;
  delayMs?: number;
  threshold?: number;
};

export function useReadTracker({
  onRead,
  enabled = true,
  delayMs = 1200,
  threshold = 0.65,
}: UseReadTrackerOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const observedElementsRef = useRef<Map<string, HTMLElement>>(new Map());
  const acknowledgedRef = useRef<Set<string>>(new Set());

  const clearTimer = useCallback((postId: string) => {
    const timer = timersRef.current.get(postId);
    if (!timer) {
      return;
    }

    clearTimeout(timer);
    timersRef.current.delete(postId);
  }, []);

  useEffect(() => {
    const observedElements = observedElementsRef.current;
    const timers = timersRef.current;

    if (!enabled) {
      observerRef.current?.disconnect();
      observerRef.current = null;
      observedElements.clear();
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const postId = (entry.target as HTMLElement).dataset.postId;
          if (!postId) {
            return;
          }

          const inView = entry.isIntersecting && entry.intersectionRatio >= threshold;
          if (!inView) {
            clearTimer(postId);
            return;
          }

          if (acknowledgedRef.current.has(postId) || timersRef.current.has(postId)) {
            return;
          }

          const timer = setTimeout(() => {
            timersRef.current.delete(postId);
            acknowledgedRef.current.add(postId);
            onRead(postId);
          }, delayMs);

          timersRef.current.set(postId, timer);
        });
      },
      {
        threshold: [0, threshold, 1],
      }
    );

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      observedElements.clear();
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, [clearTimer, delayMs, enabled, onRead, threshold]);

  const getReadRef = useCallback(
    (postId: string, isRead: boolean) => (node: HTMLElement | null) => {
      const observer = observerRef.current;
      const previousNode = observedElementsRef.current.get(postId);

      if (previousNode && observer) {
        observer.unobserve(previousNode);
      }

      clearTimer(postId);

      if (!node || !observer || !enabled || isRead) {
        observedElementsRef.current.delete(postId);
        if (isRead) {
          acknowledgedRef.current.add(postId);
        }
        return;
      }

      node.dataset.postId = postId;
      observedElementsRef.current.set(postId, node);
      observer.observe(node);
    },
    [clearTimer, enabled]
  );

  return {
    getReadRef,
  };
}
