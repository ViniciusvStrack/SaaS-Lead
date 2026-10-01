import type { TenantContext } from "@saas-lead/database";

export type PrivacyRecord = { organizationId: string; subjectId: string; kind: string; data: Record<string, unknown> };
export type PrivacyStatus = "QUEUED" | "RETAINED_LEGAL_HOLD" | "COMPLETED";
export type PrivacyRequest = { id: string; organizationId: string; requestKey: string; subjectId: string; status: PrivacyStatus; legalHoldReason?: string; completedAt?: Date };
export type SafeAuditEntry = { organizationId: string; actorId: string; action: string; resourceId: string; metadata: { subjectId: string; status: PrivacyStatus | "EXPORTED" } };
const secretKeys = new Set(["body", "content", "credentialReference", "email", "phone", "payload", "token"]);
const omitSecrets = (value: Record<string, unknown>) => Object.fromEntries(Object.entries(value).filter(([key]) => !secretKeys.has(key)));

export class InMemoryPrivacyStore {
  readonly requests: PrivacyRequest[] = [];
  readonly audit: SafeAuditEntry[] = [];
  constructor(public records: PrivacyRecord[] = []) {}
  findRequest(organizationId: string, requestKey: string) { return this.requests.find((request) => request.organizationId === organizationId && request.requestKey === requestKey); }
}

export class PrivacyLifecycleService {
  constructor(private readonly store: InMemoryPrivacyStore) {}
  async exportSubject(tenant: TenantContext, subjectId: string) {
    const records = this.store.records.filter((record) => record.organizationId === tenant.organizationId && record.subjectId === subjectId).map((record) => ({ kind: record.kind, data: omitSecrets(record.data) }));
    this.audit(tenant, `export:${subjectId}`, subjectId, "EXPORTED");
    return { organizationId: tenant.organizationId, subjectId, generatedAt: new Date(), records };
  }
  async requestDeletion(tenant: TenantContext, input: { requestKey: string; subjectId: string; legalHoldReason?: string }) {
    const existing = this.store.findRequest(tenant.organizationId, input.requestKey);
    if (existing) return existing;
    const request: PrivacyRequest = { id: `privacy-${this.store.requests.length + 1}`, organizationId: tenant.organizationId, requestKey: input.requestKey, subjectId: input.subjectId, status: input.legalHoldReason ? "RETAINED_LEGAL_HOLD" : "QUEUED", ...(input.legalHoldReason ? { legalHoldReason: input.legalHoldReason } : {}) };
    this.store.requests.push(request);
    this.audit(tenant, request.id, request.subjectId, request.status);
    return request;
  }
  async processDeletion(requestId: string) {
    const request = this.store.requests.find((candidate) => candidate.id === requestId);
    if (!request || request.status === "RETAINED_LEGAL_HOLD" || request.status === "COMPLETED") return request;
    this.store.records = this.store.records.filter((record) => record.organizationId !== request.organizationId || record.subjectId !== request.subjectId);
    request.status = "COMPLETED";
    request.completedAt = new Date();
    this.store.audit.push({ organizationId: request.organizationId, actorId: "system", action: "privacy.deletion.completed", resourceId: request.id, metadata: { subjectId: request.subjectId, status: request.status } });
    return request;
  }
  private audit(tenant: TenantContext, resourceId: string, subjectId: string, status: PrivacyStatus | "EXPORTED") {
    this.store.audit.push({ organizationId: tenant.organizationId, actorId: tenant.userId, action: status === "EXPORTED" ? "privacy.export.completed" : "privacy.deletion.requested", resourceId, metadata: { subjectId, status } });
  }
}
