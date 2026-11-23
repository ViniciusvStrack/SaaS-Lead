import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const baseUrl = process.env.API_BASE_URL;
  const session = (await cookies()).get("saas_lead_session")?.value;
  if (!baseUrl || !session) return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/subscriptions/authorize`, { method: "POST", headers: { "Content-Type": "application/json", Cookie: `saas_lead_session=${encodeURIComponent(session)}` }, body: await request.text(), cache: "no-store" });
  return new NextResponse(await response.text(), { status: response.status, headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" } });
}
