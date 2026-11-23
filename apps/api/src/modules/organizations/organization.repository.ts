import type { TenantContext } from "@saas-lead/database";
import type { BusinessHoursPeriod } from "@saas-lead/contracts";

export interface BusinessSettingsRecord {
  id: string;
  organizationId: string;
  description?: string;
  industry?: string;
  tone?: string;
  version: number;
  name?: string;
  timezone?: string;
  businessHours?: BusinessHoursPeriod[];
  allowDiscounts?: boolean;
  allowedClaims?: string[];
  commercialPolicies?: string[];
  goals?: string[];
}

export interface BusinessSettingsUpdate {
  description?: string;
  industry?: string;
  tone?: string;
  name?: string;
  timezone?: string;
  businessHours?: BusinessHoursPeriod[];
  allowDiscounts?: boolean;
  allowedClaims?: string[];
  commercialPolicies?: string[];
  goals?: string[];
}

export abstract class OrganizationRepository {
  abstract findSettings(tenant: TenantContext, organizationId: string): Promise<BusinessSettingsRecord | undefined>;
  abstract updateSettings(
    tenant: TenantContext,
    organizationId: string,
    update: BusinessSettingsUpdate,
  ): Promise<BusinessSettingsRecord | undefined>;
}
