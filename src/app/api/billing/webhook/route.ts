import { NextResponse } from "next/server";
import Stripe from "stripe";

import { db } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe";

function getCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
  if (!customer) {
    return null;
  }

  return typeof customer === "string" ? customer : customer.id;
}

async function setUserPlanByCustomerId(customerId: string, plan: "free" | "pro") {
  await db.user.updateMany({
    where: {
      stripeCustomerId: customerId,
    },
    data: {
      plan,
    },
  });
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { success: false, data: null, error: "Billing is not configured" },
      { status: 503 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ success: false, data: null, error: "Missing Stripe signature" }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Invalid Stripe signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = getCustomerId(session.customer);
      const userId = session.metadata?.userId;

      if (userId) {
        await db.user.update({
          where: {
            id: userId,
          },
          data: {
            stripeCustomerId: customerId ?? undefined,
            plan: "pro",
          },
        });
      } else if (customerId) {
        await setUserPlanByCustomerId(customerId, "pro");
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = getCustomerId(subscription.customer);

      if (customerId) {
        const proStatuses = new Set(["active", "trialing", "past_due"]);
        await setUserPlanByCustomerId(customerId, proStatuses.has(subscription.status) ? "pro" : "free");
      }
    }

    return NextResponse.json({ success: true, data: { received: true } });
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Failed to process webhook event" }, { status: 500 });
  }
}
