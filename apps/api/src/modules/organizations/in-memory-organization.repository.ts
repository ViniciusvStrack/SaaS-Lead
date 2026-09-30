import { Injectable } from "@nestjs/common";
import type { TenantContext } from "@saas-lead/database";

import type { BusinessSettingsRecord, BusinessSettingsUpdate } from "./organization.repository.js";
import { OrganizationRepository } from "./organization.repository.js";

@Injectable()
export class InMemoryOrganizationRepository extends OrganizationRepository {
  private readonly settings = new Map<string, BusinessSettingsRecord>();

  async findSettings(tenant: TenantContext, organizationId: string): Promise<BusinessSettingsRecord | undefined> {
    if (tenant.organizationId !== organizationId) return undefined;
    return this.settings.get(tenant.organizationId);
  }

  async updateSettings(
    tenant: TenantContext,
    organizationId: string,
    update: BusinessSettingsUpdate,
  ): Promise<BusinessSettingsRecord | undefined> {
    if (tenant.organizationId !== organizationId) return undefined;
    const current = this.settings.get(tenant.organizationId);
    const next: BusinessSettingsRecord = {
      id: current?.id ?? `settings-${tenant.organizationId}`,
      organizationId: tenant.organizationId,
      ...(current?.description ? { description: current.description } : {}),
      ...(current?.industry ? { industry: current.industry } : {}),
      ...(current?.tone ? { tone: current.tone } : {}),
      ...update,
      version: (current?.version ?? 0) + 1,
    };
    this.settings.set(tenant.organizationId, next);
    return next;
  }
}
