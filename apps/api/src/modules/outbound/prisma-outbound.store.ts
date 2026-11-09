import type { DatabaseClient } from "@saas-lead/database";
import type { PolicyReason } from "@saas-lead/policy";
import type { OutboundRecord, OutboundStore } from "./outbound-approval.service.js";

type PolicyDecisionRow = {
  decision: string;
  reasons: unknown;
  policyVersion: string;
  contextSnapshot: unknown;
  createdAt: Date;
};

export class PrismaOutboundStore implements OutboundStore {
  constructor(private readonly database: DatabaseClient) {}

  async find(organizationId: string, idempotencyKey: string) {
    const record = await this.database.outboundMessage.findFirst({
      where: { organizationId, idempotencyKey },
      include: { policyDecisions: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (!record) return undefined;
    return toRecord(record);
  }

  async save(record: OutboundRecord) {
    const created = await this.database.outboundMessage.create({
      data: {
        id: record.id,
        organizationId: record.organizationId,
        conversationId: record.conversationId,
        ...(record.opportunityId ? { opportunityId: record.opportunityId } : {}),
        ...(record.suggestionId ? { suggestionId: record.suggestionId } : {}),
        idempotencyKey: record.idempotencyKey,
        currentPolicyDecisionId: null,
        status: record.status,
        content: record.content,
        contentHash: record.contentHash,
        ...(record.templateId ? { templateId: record.templateId } : {}),
      },
      include: { policyDecisions: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    if (record.policyDecision) {
      await this.database.policyDecision.create({
        data: {
          id: record.id,
          organizationId: record.organizationId,
          outboundMessageId: record.id,
          decision: record.policyDecision.decision,
          reasons: record.policyDecision.reasons,
          policyVersion: record.policyDecision.policyVersion,
          contextSnapshot: record.context,
        },
      });
    }

    return toRecord(created);
  }
}

function toRecord(record: {
  id: string;
  organizationId: string;
  conversationId: string;
  opportunityId: string | null;
  suggestionId: string | null;
  idempotencyKey: string;
  status: string;
  content: string;
  contentHash: string;
  templateId: string | null;
  policyDecisions: PolicyDecisionRow[];
}): OutboundRecord {
  const latestDecision = record.policyDecisions?.[0];
  return {
    id: record.id,
    organizationId: record.organizationId,
    conversationId: record.conversationId,
    ...(record.opportunityId ? { opportunityId: record.opportunityId } : {}),
    ...(record.suggestionId ? { suggestionId: record.suggestionId } : {}),
    ...(record.templateId ? { templateId: record.templateId } : {}),
    content: record.content,
    contentHash: record.contentHash,
    idempotencyKey: record.idempotencyKey,
    status: record.status as "APPROVED" | "BLOCKED",
    actorCanApprove: true,
    context: latestDecision?.contextSnapshot as unknown as Record<string, unknown>,
    policyDecision: latestDecision
      ? {
          decision: latestDecision.decision as "APPROVED" | "BLOCKED",
          reasons: (Array.isArray(latestDecision.reasons)
            ? latestDecision.reasons
            : []) as unknown as PolicyReason[],
          policyVersion: latestDecision.policyVersion as "outbound-policy.v1",
        }
      : { decision: "BLOCKED", reasons: [], policyVersion: "outbound-policy.v1" },
    createdAt: record.policyDecisions?.[0]?.createdAt ?? new Date(),
  } as OutboundRecord;
}
