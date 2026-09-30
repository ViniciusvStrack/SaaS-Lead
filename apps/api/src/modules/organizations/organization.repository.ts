import type { TenantContext } from "@saas-lead/database";

export interface BusinessSettingsRecord {
  id: string;
  organizationId: string;
  description?: string;
  industry?: string;
  tone?: string;
  version: number;
}

export interface BusinessSettingsUpdate {
  description?: string;
  industry?: string;
  tone?: string;
}

export abstract class OrganizationRepository {
  abstract findSettings(tenant: TenantContext, organizationId: string): Promise<BusinessSettingsRecord | undefined>;
  abstract updateSettings(
    tenant: TenantContext,
    organizationId: string,
    update: BusinessSettingsUpdate,
  ): Promise<BusinessSettingsRecord | undefined>;
}
