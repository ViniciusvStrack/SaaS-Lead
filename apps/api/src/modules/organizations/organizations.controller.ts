import { Body, Controller, Get, Headers, Inject, Param, Put } from "@nestjs/common";
import { createTenantContext } from "@saas-lead/database";

import type { BusinessSettingsUpdate } from "./organization.repository.js";
import type { OrganizationsService } from "./organizations.service.js";

@Controller("organizations")
export class OrganizationsController {
  constructor(@Inject("ORGANIZATIONS_SERVICE") private readonly organizations: OrganizationsService) {}

  @Get(":organizationId/settings")
  getSettings(
    @Param("organizationId") organizationId: string,
    @Headers("x-organization-id") activeOrganizationId?: string,
    @Headers("x-user-id") userId?: string,
    @Headers("x-role") role?: string,
  ) {
    return this.organizations.getSettings(
      createTenantContext({ organizationId: activeOrganizationId, userId, role }),
      organizationId,
    );
  }

  @Put(":organizationId/settings")
  updateSettings(
    @Param("organizationId") organizationId: string,
    @Body() body: BusinessSettingsUpdate & { organizationId?: string },
    @Headers("x-organization-id") activeOrganizationId?: string,
    @Headers("x-user-id") userId?: string,
    @Headers("x-role") role?: string,
  ) {
    const update: BusinessSettingsUpdate = {
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.industry !== undefined ? { industry: body.industry } : {}),
      ...(body.tone !== undefined ? { tone: body.tone } : {}),
    };
    return this.organizations.updateSettings(
      createTenantContext({ organizationId: activeOrganizationId, userId, role }),
      organizationId,
      update,
    );
  }
}
