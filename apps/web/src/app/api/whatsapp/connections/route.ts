import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function forward(request: Request, method: "GET" | "POST") {
  const baseUrl = process.env.API_BASE_URL; const session = (await cookies()).get("saas_lead_session")?.value;
  if (!baseUrl || !session) return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/whatsapp/connections`, { method, headers: { Cookie: `saas_lead_session=${encodeURIComponent(session)}`, ...(method === "POST" ? { "Content-Type": "application/json" } : {}) }, ...(method === "POST" ? { body: await request.text() } : {}), cache: "no-store" });
    return new NextResponse(await response.text(), { status: response.status, headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" } });
  } catch { return NextResponse.json({ message: "API unavailable" }, { status: 502 }); }
}
export async function GET(request: Request) { return forward(request, "GET"); }
export async function POST(request: Request) { return forward(request, "POST"); }
