export type WebSession = {
  userId: string;
  organizationId: string;
  role: "OWNER" | "ADMIN" | "AGENT";
  expiresAt: string;
};

export class UnauthenticatedError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "UnauthenticatedError";
  }
}

export async function requireSession(loader: () => Promise<WebSession | null>): Promise<WebSession> {
  const session = await loader();
  if (!session || Date.parse(session.expiresAt) <= Date.now()) {
    throw new UnauthenticatedError();
  }
  return session;
}
