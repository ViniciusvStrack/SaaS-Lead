import type { TenantContext, DatabaseClient } from "@saas-lead/database";
import type { BusinessSettingsRecord, BusinessSettingsUpdate } from "./organization.repository.js";
import { OrganizationRepository } from "./organization.repository.js";

export class PrismaOrganizationRepository extends OrganizationRepository {
  constructor(private readonly database: DatabaseClient) { super(); }

  async findSettings(tenant: TenantContext, organizationId: string): Promise<BusinessSettingsRecord | undefined> {
    if (tenant.organizationId !== organizationId) return undefined;
    const settings = await this.database.businessSettings.findUnique({ where: { organizationId } });
    return settings ? toRecord(settings) : undefined;
  }

  async updateSettings(tenant: TenantContext, organizationId: string, update: BusinessSettingsUpdate): Promise<BusinessSettingsRecord | undefined> {
    if (tenant.organizationId !== organizationId) return undefined;
    const organization = await this.database.organization.findFirst({ where: { id: organizationId, status: "ACTIVE" }, select: { id: true } });
    if (!organization) return undefined;
    const settings = await this.database.businessSettings.upsert({
      where: { organizationId },
      create: { organizationId, ...update },
      update: { ...update, version: { increment: 1 } },
    });
    return toRecord(settings);
  }
}

function toRecord(settings: { id: string; organizationId: string; description: string | null; industry: string | null; tone: string | null; version: number }): BusinessSettingsRecord {
  return {
    id: settings.id,
    organizationId: settings.organizationId,
    ...(settings.description ? { description: settings.description } : {}),
    ...(settings.industry ? { industry: settings.industry } : {}),
    ...(settings.tone ? { tone: settings.tone } : {}),
    version: settings.version,
  };
}
