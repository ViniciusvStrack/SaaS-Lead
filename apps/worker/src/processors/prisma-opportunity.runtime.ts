import { OpportunityEngine, type OpportunityCandidate } from "@saas-lead/contracts";
import type { DatabaseClient } from "@saas-lead/database";

export interface DetectOpportunityJob { organizationId: string; conversationId: string }

export class PrismaOpportunityRuntime {
  private readonly engine = new OpportunityEngine();

  constructor(private readonly database: DatabaseClient, private readonly now: () => Date = () => new Date()) {}

  async process(job: DetectOpportunityJob): Promise<OpportunityCandidate[]> {
    const conversation = await this.database.conversation.findFirst({ where: { id: job.conversationId, organizationId: job.organizationId } });
    if (!conversation) throw new Error("Conversation not found for tenant");
    const [analysis, messages] = await Promise.all([
      this.database.aIAnalysis.findFirst({ where: { organizationId: job.organizationId, conversationId: job.conversationId }, orderBy: { createdAt: "desc" } }),
      this.database.message.findMany({ where: { organizationId: job.organizationId, conversationId: job.conversationId }, orderBy: { occurredAt: "desc" } }),
    ]);
    if (!analysis) return [];
    const signals = analysis.analysis as { intent?: unknown; stage?: unknown; urgency?: unknown };
    if (typeof signals.intent !== "string" || typeof signals.stage !== "string" || typeof signals.urgency !== "number") return [];
    const lastInboundAt = messages.find((message) => message.direction === "INBOUND")?.occurredAt;
    const lastOutboundAt = messages.find((message) => message.direction === "OUTBOUND")?.occurredAt;
    const candidates = this.engine.detect({ organizationId: job.organizationId, conversationId: job.conversationId, analysis: { intent: signals.intent, stage: signals.stage, urgency: signals.urgency }, now: this.now(), ...(lastInboundAt ? { lastInboundAt } : {}), ...(lastOutboundAt ? { lastOutboundAt } : {}) });
    for (const candidate of candidates) {
      await this.database.$transaction(async (transaction) => {
        const existing = await transaction.opportunity.findUnique({ where: { organizationId_deduplicationKey: { organizationId: job.organizationId, deduplicationKey: candidate.deduplicationKey } } });
        if (existing) return;
        await transaction.opportunity.create({ data: { organizationId: job.organizationId, conversationId: job.conversationId, deduplicationKey: candidate.deduplicationKey, type: candidate.type, priority: candidate.priority, knownValue: candidate.knownValue, ruleVersion: candidate.ruleVersion, evidence: candidate.evidence, events: { create: { organizationId: job.organizationId, type: "DETECTED" } } } });
      }, { isolationLevel: "Serializable" });
    }
    return candidates;
  }
}
