export type CurrentSubscription = { id: string; planCode: string; planName: string; status: string; trialEndsAt: string | null; currentPeriodEndsAt: string | null; createdAt: string };
export type BillingResult = { status: "ready"; subscription: CurrentSubscription | null } | { status: "unauthenticated" | "unavailable" };

export async function loadCurrentSubscription(token: string | undefined, baseUrl: string | undefined, fetcher: typeof fetch = fetch): Promise<BillingResult> {
  if (!token) return { status: "unauthenticated" };
  if (!baseUrl) return { status: "unavailable" };
  try {
    const response = await fetcher(`${baseUrl.replace(/\/$/, "")}/subscriptions/current`, { headers: { Cookie: `saas_lead_session=${encodeURIComponent(token)}` }, cache: "no-store" });
    if (response.status === 401) return { status: "unauthenticated" };
    if (!response.ok) return { status: "unavailable" };
    const body = await response.json() as { subscription?: CurrentSubscription | null };
    return { status: "ready", subscription: body.subscription ?? null };
  } catch {
    return { status: "unavailable" };
  }
}
