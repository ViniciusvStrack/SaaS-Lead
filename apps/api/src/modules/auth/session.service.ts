import { createHash, randomBytes } from "node:crypto";

import { Injectable, UnauthorizedException } from "@nestjs/common";

export type SessionRole = "OWNER" | "ADMIN" | "AGENT";

export interface SessionRecord {
  tokenHash: string;
  userId: string;
  organizationId: string;
  role: SessionRole;
  expiresAt: Date;
}

export interface SessionStore {
  save(session: SessionRecord): Promise<void>;
  findByHash(tokenHash: string): Promise<SessionRecord | undefined>;
  delete(tokenHash: string): Promise<void>;
}

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function buildSessionCookie(token: string, secure: boolean): string {
  return [
    `saas_lead_session=${token}`,
    "Path=/",
    "HttpOnly",
    ...(secure ? ["Secure"] : []),
    "SameSite=Lax",
  ].join("; ");
}

@Injectable()
export class InMemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, SessionRecord>();

  async save(session: SessionRecord): Promise<void> {
    this.sessions.set(session.tokenHash, session);
  }

  async findByHash(tokenHash: string): Promise<SessionRecord | undefined> {
    return this.sessions.get(tokenHash);
  }

  async delete(tokenHash: string): Promise<void> {
    this.sessions.delete(tokenHash);
  }
}

@Injectable()
export class SessionService {
  constructor(
    private readonly store: SessionStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async create(input: Omit<SessionRecord, "tokenHash">): Promise<string> {
    const token = randomBytes(32).toString("base64url");
    await this.store.save({ ...input, tokenHash: hashOpaqueToken(token) });
    return token;
  }

  async requireSession(token: string | undefined): Promise<Omit<SessionRecord, "tokenHash">> {
    const failure = () => new UnauthorizedException("Authentication required");
    if (!token) throw failure();
    const tokenHash = hashOpaqueToken(token);
    const session = await this.store.findByHash(tokenHash);
    if (!session || session.expiresAt.getTime() <= this.now().getTime()) {
      if (session) await this.store.delete(tokenHash);
      throw failure();
    }
    return {
      userId: session.userId,
      organizationId: session.organizationId,
      role: session.role,
      expiresAt: session.expiresAt,
    };
  }
}
