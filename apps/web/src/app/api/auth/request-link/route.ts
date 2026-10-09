import { NextResponse } from "next/server";
import { requestLoginLink } from "../../../../lib/auth-api";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = form.get("email");
  if (typeof email !== "string") return NextResponse.redirect(new URL("/login?error=email", request.url), 303);
  try {
    const result = await requestLoginLink(email);
    if (result.verificationToken) {
      const verifyUrl = new URL("/api/auth/verify", request.url);
      verifyUrl.searchParams.set("token", result.verificationToken);
      return NextResponse.redirect(verifyUrl, 303);
    }
    return NextResponse.redirect(new URL("/login?sent=1", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/login?error=service", request.url), 303);
  }
}
