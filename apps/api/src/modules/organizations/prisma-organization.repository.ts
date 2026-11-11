import type { TenantContext, DatabaseClient } from "@saas-lead/database";
import type { BusinessHoursPeriod } from "@saas-lead/contracts";
import type { BusinessSettingsRecord, BusinessSettingsUpdate } from "./organization.repository.js";
import { OrganizationRepository } from "./organization.repository.js";

export class PrismaOrganizationRepository extends OrganizationRepository {
  constructor(private readonly database: DatabaseClient) { super(); }

  async findSettings(tenant: TenantContext, organizationId: string): Promise<BusinessSettingsRecord | undefined> {
    if (tenant.organizationId !== organizationId) return undefined;
    const [settings, organization] = await Promise.all([
      this.database.businessSettings.findUnique({ where: { organizationId } }),
      this.database.organization.findFirst({ where: { id: organizationId, status: "ACTIVE" }, select: { id: true, name: true, timezone: true } }),
    ]);
    return organization ? toRecord(settings, organization) : undefined;
  }

  async updateSettings(tenant: TenantContext, organizationId: string, update: BusinessSettingsUpdate): Promise<BusinessSettingsRecord | undefined> {
    if (tenant.organizationId !== organizationId) return undefined;
    const organization = await this.database.organization.findFirst({ where: { id: organizationId, status: "ACTIVE" }, select: { id: true, name: true, timezone: true } });
    if (!organization) return undefined;
    const { name, timezone, businessHours, allowDiscounts, allowedClaims, commercialPolicies, goals, ...settingsUpdate } = update;
    if (name !== undefined || timezone !== undefined) {
      await this.database.organization.update({ where: { id: organizationId }, data: { ...(name !== undefined ? { name } : {}), ...(timezone !== undefined ? { timezone } : {}) } });
    }
    const settings = await this.database.businessSettings.upsert({
      where: { organizationId },
      create: { organizationId, ...settingsUpdate, ...(businessHours !== undefined ? { businessHours: toJson(businessHours) } : {}), ...(allowedClaims !== undefined ? { allowedClaims: toJson(allowedClaims) } : {}), ...(commercialPolicies !== undefined ? { commercialPolicies: toJson(commercialPolicies) } : {}), ...(goals !== undefined ? { goals: toJson(goals) } : {}), ...(allowDiscounts !== undefined ? { discountPolicy: { enabled: allowDiscounts } } : {}) },
      update: { ...settingsUpdate, ...(businessHours !== undefined ? { businessHours: toJson(businessHours) } : {}), ...(allowedClaims !== undefined ? { allowedClaims: toJson(allowedClaims) } : {}), ...(commercialPolicies !== undefined ? { commercialPolicies: toJson(commercialPolicies) } : {}), ...(goals !== undefined ? { goals: toJson(goals) } : {}), ...(allowDiscounts !== undefined ? { discountPolicy: { enabled: allowDiscounts } } : {}), version: { increment: 1 } },
    });
    return toRecord(settings, { id: organization.id, name: name ?? organization.name, timezone: timezone ?? organization.timezone });
  }
}

function toRecord(settings: { id: string; organizationId: string; description: string | null; industry: string | null; tone: string | null; businessHours: unknown; allowedClaims: unknown; discountPolicy: unknown; commercialPolicies: unknown; goals: unknown; version: number } | null, organization: { id: string; name: string; timezone: string }): BusinessSettingsRecord {
  return {
    id: settings?.id ?? `settings-${organization.name}`,
    organizationId: settings?.organizationId ?? organization.id,
    ...(settings?.description ? { description: settings.description } : {}),
    ...(settings?.industry ? { industry: settings.industry } : {}),
    ...(settings?.tone ? { tone: settings.tone } : {}),
    version: settings?.version ?? 0,
    name: organization.name,
    timezone: organization.timezone,
    businessHours: (Array.isArray(settings?.businessHours) ? settings.businessHours : []) as BusinessHoursPeriod[],
    allowDiscounts: typeof settings?.discountPolicy === "object" && settings.discountPolicy !== null && (settings.discountPolicy as { enabled?: unknown }).enabled !== false,
    allowedClaims: Array.isArray(settings?.allowedClaims) ? settings.allowedClaims as string[] : [],
    commercialPolicies: Array.isArray(settings?.commercialPolicies) ? settings.commercialPolicies as string[] : [],
    goals: Array.isArray(settings?.goals) ? settings.goals as string[] : [],
  };
}

function toJson(value: unknown): any { return JSON.parse(JSON.stringify(value)); }
