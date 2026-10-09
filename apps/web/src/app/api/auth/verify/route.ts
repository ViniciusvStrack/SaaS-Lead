import { NextResponse } from "next/server";
import { verifyLoginToken } from "../../../../lib/auth-api";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/login?error=link", request.url), 303);
  try {
    const session = await verifyLoginToken(token);
    const response = NextResponse.redirect(new URL("/opportunities", request.url), 303);
    response.cookies.set("saas_lead_session", session.sessionToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: new Date(session.expiresAt) });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=link", request.url), 303);
  }
}
