import { Injectable } from "@nestjs/common";
import type { TenantContext } from "@saas-lead/database";

export interface AuditEntry {
  organizationId: string;
  actorType: "USER" | "SYSTEM";
  actorId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  occurredAt: Date;
}

export interface AuditStore {
  append(entry: AuditEntry): Promise<void>;
}

export interface AuditEvent {
  tenant: TenantContext;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly store: AuditStore) {}

  async record(event: AuditEvent): Promise<void> {
    await this.store.append({
      organizationId: event.tenant.organizationId,
      actorType: "USER",
      actorId: event.tenant.userId,
      action: event.action,
      resourceType: event.resourceType,
      ...(event.resourceId ? { resourceId: event.resourceId } : {}),
      ...(event.metadata ? { metadata: event.metadata } : {}),
      occurredAt: new Date(),
    });
  }
}
