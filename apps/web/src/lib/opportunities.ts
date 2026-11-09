export interface OpportunitySuggestion {
  content: string;
  status: string;
  createdAt: string;
}

export interface OpportunityItem {
  id: string;
  contactName: string;
  type: string;
  priority: string;
  status: string;
  knownValue: string | null;
  evidence: string[];
  ruleVersion: string;
  suggestion?: OpportunitySuggestion | null;
}

export type OpportunitiesResult =
  | { status: "ready"; items: OpportunityItem[] }
  | { status: "unauthenticated" | "unavailable" };

export type OpportunityResult =
  | { status: "ready"; item: OpportunityItem }
  | { status: "unauthenticated" | "unavailable" | "not-found" };

function requestOptions(token: string): RequestInit {
  return { headers: { Cookie: `saas_lead_session=${encodeURIComponent(token)}` }, cache: "no-store" };
}

export async function loadOpportunities(token: string | undefined, baseUrl: string | undefined, fetcher: typeof fetch = fetch): Promise<OpportunitiesResult> {
  if (!token) return { status: "unauthenticated" };
  if (!baseUrl) return { status: "unavailable" };
  try {
    const response = await fetcher(`${baseUrl.replace(/\/$/, "")}/opportunities`, requestOptions(token));
    if (response.status === 401) return { status: "unauthenticated" };
    if (!response.ok) return { status: "unavailable" };
    const body = await response.json() as { items?: OpportunityItem[] };
    return Array.isArray(body.items) ? { status: "ready", items: body.items } : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}

export async function loadOpportunity(id: string, token: string | undefined, baseUrl: string | undefined, fetcher: typeof fetch = fetch): Promise<OpportunityResult> {
  if (!token) return { status: "unauthenticated" };
  if (!baseUrl) return { status: "unavailable" };
  try {
    const response = await fetcher(`${baseUrl.replace(/\/$/, "")}/opportunities/${encodeURIComponent(id)}`, requestOptions(token));
    if (response.status === 401) return { status: "unauthenticated" };
    if (response.status === 404) return { status: "not-found" };
    if (!response.ok) return { status: "unavailable" };
    return { status: "ready", item: await response.json() as OpportunityItem };
  } catch {
    return { status: "unavailable" };
  }
}
