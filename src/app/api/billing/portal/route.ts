import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth-middleware";
import { db } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe";

function resolveAppUrl(request: Request) {
  return request.headers.get("origin") ?? process.env.AUTH_URL ?? new URL(request.url).origin;
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const stripe = getStripeClient();

    if (!stripe) {
      return NextResponse.json(
        { success: false, data: null, error: "Billing is not configured" },
        { status: 503 }
      );
    }

    const user = await db.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        stripeCustomerId: true,
      },
    });

    if (!user?.stripeCustomerId) {
      return NextResponse.json({ success: false, data: null, error: "No billing account found" }, { status: 404 });
    }

    const appUrl = resolveAppUrl(request);
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/settings`,
    });

    return NextResponse.json({
      success: true,
      data: {
        portalUrl: portalSession.url,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, data: null, error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ success: false, data: null, error: "Failed to create portal session" }, { status: 500 });
  }
}
