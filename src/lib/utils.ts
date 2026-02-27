import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import type { ApiResponse } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function ensureUtcDate(value: Date | string): Date {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(date.toISOString());
}

export function nowUtc(): Date {
  return new Date(new Date().toISOString());
}

export function createApiResponse<T>(data: T, meta?: ApiResponse<T>["meta"]): ApiResponse<T> {
  return {
    success: true,
    data,
    meta,
  };
}

export function createApiError(error: string): ApiResponse<null> {
  return {
    success: false,
    data: null,
    error,
  };
}
