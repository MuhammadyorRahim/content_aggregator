import { NextResponse } from "next/server";

/**
 * Handles errors thrown inside API route handlers.
 * Returns the correct HTTP status based on the error type
 * instead of blindly returning 401 for every failure.
 */
export function handleApiError(error: unknown, fallbackMessage = "Internal server error") {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, data: null, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (error.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, data: null, error: "Forbidden" },
        { status: 403 }
      );
    }

    if (error.message === "SOURCE_LIMIT_REACHED") {
      return NextResponse.json(
        { success: false, data: null, error: "Free plan supports up to 5 sources. Upgrade to Pro for unlimited." },
        { status: 403 }
      );
    }
  }

  console.error(`[api] ${fallbackMessage}:`, error);

  return NextResponse.json(
    { success: false, data: null, error: fallbackMessage },
    { status: 500 }
  );
}
