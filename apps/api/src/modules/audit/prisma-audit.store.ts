import type { DatabaseClient } from "@saas-lead/database";
import type { AuditEntry, AuditStore } from "./audit.service.js";

export class PrismaAuditStore implements AuditStore {
  constructor(private readonly database: DatabaseClient) {}

  async append(entry: AuditEntry): Promise<void> {
    await this.database.auditLog.create({
      data: {
        organizationId: entry.organizationId,
        actorType: entry.actorType,
        ...(entry.actorId ? { actorId: entry.actorId } : {}),
        action: entry.action,
        resourceType: entry.resourceType,
        ...(entry.resourceId ? { resourceId: entry.resourceId } : {}),
        ...(entry.metadata ? { metadata: JSON.parse(JSON.stringify(entry.metadata)) } : {}),
        occurredAt: entry.occurredAt,
      },
    });
  }
}
