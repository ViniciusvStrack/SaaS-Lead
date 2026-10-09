import { createHash, randomBytes } from "node:crypto";
import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import type { DatabaseClient } from "@saas-lead/database";
import { SessionService } from "./session.service.js";

const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class LoginService {
  constructor(
    private readonly database: DatabaseClient,
    private readonly sessions: SessionService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async requestLink(emailInput: string | undefined): Promise<string | undefined> {
    const email = emailInput?.trim().toLowerCase();
    if (!email || !email.includes("@") || email.length > 254) throw new BadRequestException("Valid email is required");
    const membership = await this.database.organizationMember.findFirst({
      where: { status: "ACTIVE", user: { email, status: "ACTIVE" }, organization: { status: "ACTIVE" } },
      orderBy: { createdAt: "asc" },
    });
    if (!membership) return undefined;
    const token = randomBytes(32).toString("base64url");
    await this.database.authLoginToken.create({
      data: {
        tokenHash: hashToken(token),
        userId: membership.userId,
        organizationId: membership.organizationId,
        expiresAt: new Date(this.now().getTime() + LOGIN_TOKEN_TTL_MS),
      },
    });
    return token;
  }

  async verify(token: string | undefined): Promise<{ sessionToken: string; expiresAt: Date }> {
    if (!token) throw new UnauthorizedException("Invalid or expired login link");
    const tokenHash = hashToken(token);
    const record = await this.database.authLoginToken.findUnique({ where: { tokenHash } });
    const now = this.now();
    if (!record || record.consumedAt || record.expiresAt <= now) throw new UnauthorizedException("Invalid or expired login link");
    const membership = await this.database.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: record.organizationId, userId: record.userId } },
      include: { user: true, organization: true },
    });
    if (!membership || membership.status !== "ACTIVE" || membership.user.status !== "ACTIVE" || membership.organization.status !== "ACTIVE") {
      throw new UnauthorizedException("Invalid or expired login link");
    }
    const consumed = await this.database.authLoginToken.updateMany({ where: { tokenHash, consumedAt: null }, data: { consumedAt: now } });
    if (consumed.count !== 1) throw new UnauthorizedException("Invalid or expired login link");
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    const sessionToken = await this.sessions.create({
      userId: record.userId,
      organizationId: record.organizationId,
      role: membership.role,
      expiresAt,
    });
    return { sessionToken, expiresAt };
  }
}
