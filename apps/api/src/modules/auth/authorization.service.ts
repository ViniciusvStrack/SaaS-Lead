import { Injectable } from "@nestjs/common";

import type { SessionRole } from "./session.service.js";

export type AuthorizationAction =
  | "organization.read"
  | "organization.update"
  | "membership.read"
  | "membership.invite"
  | "membership.change_role"
  | "billing.manage"
  | "conversation.read"
  | "message.approve";

export interface AuthorizationContext {
  organizationId: string;
  userId: string;
  role: SessionRole;
}

export interface AuthorizationDecision {
  allowed: boolean;
  reason: "allowed" | "insufficient_role" | "tenant_mismatch";
}

const permissions: Record<SessionRole, ReadonlySet<AuthorizationAction>> = {
  OWNER: new Set([
    "organization.read", "organization.update", "membership.read", "membership.invite",
    "membership.change_role", "billing.manage", "conversation.read", "message.approve",
  ]),
  ADMIN: new Set([
    "organization.read", "organization.update", "membership.read", "membership.invite",
    "conversation.read", "message.approve",
  ]),
  AGENT: new Set(["organization.read", "conversation.read", "message.approve"]),
};

@Injectable()
export class AuthorizationService {
  authorize(
    action: AuthorizationAction,
    resource: string | { type: string; organizationId: string },
    context: AuthorizationContext,
  ): AuthorizationDecision {
    if (typeof resource !== "string" && resource.organizationId !== context.organizationId) {
      return { allowed: false, reason: "tenant_mismatch" };
    }
    const allowed = permissions[context.role].has(action);
    return { allowed, reason: allowed ? "allowed" : "insufficient_role" };
  }
}
