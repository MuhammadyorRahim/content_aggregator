import { NextResponse } from "next/server";

import { welcomeEmailTemplate } from "@/email-templates/welcome";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ success: false, data: null, error: "Token is required" }, { status: 400 });
  }

  const verificationToken = await db.verificationToken.findUnique({ where: { token } });

  if (!verificationToken || verificationToken.expires < new Date()) {
    return NextResponse.redirect(new URL("/login?verified=0", request.url));
  }

  const user = await db.user.findUnique({ where: { email: verificationToken.identifier } });
  if (!user) {
    return NextResponse.redirect(new URL("/login?verified=0", request.url));
  }

  await db.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() },
  });

  await db.verificationToken.delete({ where: { token } });

  await sendEmail({
    to: user.email,
    subject: "Welcome to Content Aggregator",
    html: welcomeEmailTemplate({ name: user.name }),
  });

  return NextResponse.redirect(new URL("/login?verified=1", request.url));
}
