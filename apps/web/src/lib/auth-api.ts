export type RequestLinkResult = { accepted: true; verificationToken?: string };
export type VerifyLoginResult = { sessionToken: string; expiresAt: string };

function apiUrl(path: string): string {
  const base = process.env.API_BASE_URL;
  if (!base) throw new Error("API_BASE_URL is required");
  return `${base.replace(/\/$/, "")}${path}`;
}

export async function requestLoginLink(email: string): Promise<RequestLinkResult> {
  const response = await fetch(apiUrl("/auth/request-link"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }), cache: "no-store" });
  if (!response.ok) throw new Error("Unable to request login link");
  return response.json() as Promise<RequestLinkResult>;
}

export async function verifyLoginToken(token: string): Promise<VerifyLoginResult> {
  const response = await fetch(apiUrl("/auth/verify"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }), cache: "no-store" });
  if (!response.ok) throw new Error("Invalid or expired login link");
  return response.json() as Promise<VerifyLoginResult>;
}
