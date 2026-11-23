import { cookies } from "next/headers";
import { NextResponse } from "next/server";

<<<<<<< HEAD
const UPSTREAM_TIMEOUT_MS = 10_000;
const UPSTREAM_ERROR = { message: "Billing service unavailable" };

=======
>>>>>>> origin/feat/mvp-implementation
export async function POST(request: Request) {
  const baseUrl = process.env.API_BASE_URL;
  const session = (await cookies()).get("saas_lead_session")?.value;
  if (!baseUrl || !session) return NextResponse.json({ message: "Authentication required" }, { status: 401 });
<<<<<<< HEAD

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `saas_lead_session=${encodeURIComponent(session)}` },
      body: await request.text(),
      cache: "no-store",
      signal: controller.signal,
    });
    const body = await response.text();

    try {
      const parsed = JSON.parse(body) as unknown;
      return NextResponse.json(parsed, { status: response.status });
    } catch {
      return NextResponse.json(UPSTREAM_ERROR, { status: 502 });
    }
  } catch {
    return NextResponse.json(UPSTREAM_ERROR, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
=======
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/subscriptions`, { method: "POST", headers: { "Content-Type": "application/json", Cookie: `saas_lead_session=${encodeURIComponent(session)}` }, body: await request.text(), cache: "no-store" });
  const body = await response.text();
  return new NextResponse(body, { status: response.status, headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" } });
>>>>>>> origin/feat/mvp-implementation
}
