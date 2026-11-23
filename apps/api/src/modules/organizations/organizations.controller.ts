import { BadRequestException, Body, Controller, Get, Headers, Inject, Param, Put } from "@nestjs/common";
import { createTenantContext } from "@saas-lead/database";

import type { BusinessSettingsUpdate } from "./organization.repository.js";
import type { OrganizationsService } from "./organizations.service.js";
import { SessionService } from "../auth/session.service.js";

@Controller("organizations")
export class OrganizationsController {
  constructor(
    @Inject("ORGANIZATIONS_SERVICE") private readonly organizations: OrganizationsService,
    private readonly sessions: SessionService,
  ) {}

  @Get("current/settings")
  async getCurrentSettings(@Headers("cookie") cookie?: string) {
    const session = await this.sessions.requireSession(this.readSessionToken(cookie));
    return this.organizations.getSettings(createTenantContext(session), session.organizationId);
  }

  @Put("current/settings")
  async updateCurrentSettings(@Body() body: BusinessSettingsUpdate, @Headers("cookie") cookie?: string) {
    const session = await this.sessions.requireSession(this.readSessionToken(cookie));
    return this.organizations.updateSettings(createTenantContext(session), session.organizationId, this.toUpdate(body));
  }

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
    const update = this.toUpdate(body);
    return this.organizations.updateSettings(
      createTenantContext({ organizationId: activeOrganizationId, userId, role }),
      organizationId,
      update,
    );
  }

  private toUpdate(body: BusinessSettingsUpdate): BusinessSettingsUpdate {
    for (const field of ["name", "industry", "tone", "description", "timezone"] as const) {
      const value = body[field];
      if (value !== undefined && (typeof value !== "string" || value.length > 500)) throw new BadRequestException(`${field} must be a string with at most 500 characters`);
    }
    if (body.timezone !== undefined && !/^[A-Za-z_]+\/[A-Za-z_]+$/.test(body.timezone)) throw new BadRequestException("Invalid timezone");
    return {
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.industry !== undefined ? { industry: body.industry } : {}),
      ...(body.tone !== undefined ? { tone: body.tone } : {}),
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
      ...(body.businessHours !== undefined ? { businessHours: body.businessHours } : {}),
      ...(body.allowDiscounts !== undefined ? { allowDiscounts: body.allowDiscounts } : {}),
      ...(body.allowedClaims !== undefined ? { allowedClaims: body.allowedClaims } : {}),
      ...(body.commercialPolicies !== undefined ? { commercialPolicies: body.commercialPolicies } : {}),
      ...(body.goals !== undefined ? { goals: body.goals } : {}),
    };
  }

  private readSessionToken(cookie?: string): string | undefined {
    return cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith("saas_lead_session="))?.slice("saas_lead_session=".length);
  }
}
