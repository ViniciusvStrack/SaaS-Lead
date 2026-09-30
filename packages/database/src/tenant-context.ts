import type { OrganizationId, UserId } from "@saas-lead/contracts";

export const tenantRoles = ["OWNER", "ADMIN", "AGENT"] as const;
export type TenantRole = (typeof tenantRoles)[number];

export interface TenantContext {
  organizationId: OrganizationId;
  userId: UserId;
  role: TenantRole;
}

export function createTenantContext(input: {
  organizationId?: string | undefined;
  userId?: string | undefined;
  role?: string | undefined;
}): TenantContext {
  if (!input.organizationId || !input.userId || !tenantRoles.includes(input.role as TenantRole)) {
    throw new Error("A valid tenant context is required");
  }

  return {
    organizationId: input.organizationId as OrganizationId,
    userId: input.userId as UserId,
    role: input.role as TenantRole,
  };
}
