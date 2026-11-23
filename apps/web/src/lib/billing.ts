export type CurrentSubscription = { id: string; planCode: string; planName: string; status: string; trialEndsAt: string | null; currentPeriodEndsAt: string | null; createdAt: string };
export type BillingResult = { status: "ready"; subscription: CurrentSubscription | null } | { status: "unauthenticated" | "unavailable" };
export type UsageSummary = { periodStart: string; planCode: string | null; usage: Record<string, number>; limits: Record<string, number> };

export async function loadUsage(fetcher: typeof fetch = fetch): Promise<UsageSummary | null> {
  const response = await fetcher("/api/billing/usage", { cache: "no-store" });
  if (!response.ok) return null;
  return await response.json() as UsageSummary;
}

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
