import { describe, expect, it } from "vitest";

import { AuthorizationService } from "../src/modules/auth/authorization.service.js";
import { buildSessionCookie, InMemorySessionStore, SessionService } from "../src/modules/auth/session.service.js";
import { InMemoryInvitationStore, InvitationService } from "../src/modules/memberships/invitation.service.js";

describe("authentication and tenant RBAC", () => {
  it("rejects missing and expired sessions without leaking their state", async () => {
    const now = new Date("2026-09-30T12:00:00Z");
    const store = new InMemorySessionStore();
    const sessions = new SessionService(store, () => now);
    const expiredToken = await sessions.create({
      userId: "user-a",
      organizationId: "org-a",
      role: "OWNER",
      expiresAt: new Date("2026-09-30T11:59:59Z"),
    });

    await expect(sessions.requireSession(undefined)).rejects.toThrow("Authentication required");
    await expect(sessions.requireSession(expiredToken)).rejects.toThrow("Authentication required");
  });

  it("builds a hardened HTTP-only session cookie", () => {
    expect(buildSessionCookie("opaque-token", true)).toContain(
      "saas_lead_session=opaque-token; Path=/; HttpOnly; Secure; SameSite=Lax",
    );
  });

  it("consumes an invitation once and rejects expired or reused tokens", async () => {
    const now = new Date("2026-09-30T12:00:00Z");
    const invitations = new InvitationService(new InMemoryInvitationStore(), () => now);
    const valid = await invitations.create({
      email: "agent@example.com",
      organizationId: "org-a",
      role: "AGENT",
      expiresAt: new Date("2026-10-01T12:00:00Z"),
    });
    const expired = await invitations.create({
      email: "old@example.com",
      organizationId: "org-a",
      role: "AGENT",
      expiresAt: new Date("2026-09-29T12:00:00Z"),
    });

    await expect(invitations.accept(valid, "user-agent")).resolves.toMatchObject({ organizationId: "org-a" });
    await expect(invitations.accept(valid, "user-agent")).rejects.toThrow("Invitation is invalid");
    await expect(invitations.accept(expired, "user-old")).rejects.toThrow("Invitation is invalid");
  });

  it.each([
    ["OWNER", "billing.manage", true],
    ["ADMIN", "membership.invite", true],
    ["ADMIN", "membership.change_role", false],
    ["AGENT", "organization.update", false],
    ["AGENT", "message.approve", true],
  ] as const)("authorizes %s for %s = %s", (role, action, allowed) => {
    const authorization = new AuthorizationService();
    expect(authorization.authorize(action, "organization", { organizationId: "org-a", userId: "user-a", role })).toEqual({
      allowed,
      reason: allowed ? "allowed" : "insufficient_role",
    });
  });

  it("denies a resource owned by another tenant for every role", () => {
    const authorization = new AuthorizationService();
    expect(
      authorization.authorize(
        "organization.read",
        { type: "organization", organizationId: "org-b" },
        { organizationId: "org-a", userId: "user-a", role: "OWNER" },
      ),
    ).toEqual({ allowed: false, reason: "tenant_mismatch" });
  });
});
