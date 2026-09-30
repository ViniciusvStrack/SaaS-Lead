import type { TenantContext } from "@saas-lead/database";

export abstract class ContactRepository {
  abstract findByExternalId(tenant: TenantContext, externalContactId: string): Promise<{ id: string; displayName?: string } | undefined>;
}
