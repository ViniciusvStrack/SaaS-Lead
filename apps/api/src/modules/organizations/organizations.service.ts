import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { TenantContext } from "@saas-lead/database";

import type { AuditService } from "../audit/audit.service.js";
import type { BusinessSettingsUpdate } from "./organization.repository.js";
import type { OrganizationRepository } from "./organization.repository.js";

@Injectable()
export class OrganizationsService {
  constructor(
    @Inject("ORGANIZATION_REPOSITORY") private readonly organizations: OrganizationRepository,
    @Inject("AUDIT_SERVICE") private readonly audit: AuditService,
  ) {}

  async getSettings(tenant: TenantContext, organizationId: string) {
    this.assertActiveTenant(tenant, organizationId);
    return (await this.organizations.findSettings(tenant, organizationId)) ?? {
      id: `settings-${tenant.organizationId}`,
      organizationId: tenant.organizationId,
      version: 0,
    };
  }

  async updateSettings(tenant: TenantContext, organizationId: string, update: BusinessSettingsUpdate) {
    this.assertActiveTenant(tenant, organizationId);
    const settings = await this.organizations.updateSettings(tenant, organizationId, update);
    if (!settings) throw new NotFoundException("Organization not found");
    await this.audit.record({
      tenant,
      action: "business_settings.updated",
      resourceType: "BusinessSettings",
      resourceId: settings.id,
      metadata: { changedFields: Object.keys(update) },
    });
    return settings;
  }

  private assertActiveTenant(tenant: TenantContext, organizationId: string): void {
    if (tenant.organizationId !== organizationId) {
      throw new NotFoundException("Organization not found");
    }
  }
}
