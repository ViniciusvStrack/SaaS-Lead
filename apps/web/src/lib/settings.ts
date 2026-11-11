export type BusinessSettings = { id: string; organizationId: string; name?: string; timezone?: string; description?: string; industry?: string; tone?: string; businessHours?: Array<{ day: string; opensAt: string; closesAt: string }>; allowDiscounts?: boolean; version: number };

export async function loadSettings(fetcher: typeof fetch = fetch): Promise<BusinessSettings | null> {
  const response = await fetcher("/api/settings", { cache: "no-store" });
  if (!response.ok) return null;
  return await response.json() as BusinessSettings;
}
