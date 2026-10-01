import { conversationAnalysisSchema, type AIProvider, type ConversationAnalysis } from "@saas-lead/ai";
import type { DatabaseClient } from "@saas-lead/database";
import { AnalyzeConversationProcessor, type AnalysisStore, type StoredAnalysis, type UsageRecord } from "./analyze-conversation.processor.js";

export interface AnalyzeConversationQueueJob { organizationId: string; conversationId: string }

class PrismaAnalysisStore implements AnalysisStore {
  constructor(private readonly database: DatabaseClient, private readonly providerName: string) {}

  async findByHash(organizationId: string, inputHash: string): Promise<StoredAnalysis | undefined> {
    const stored = await this.database.aIAnalysis.findUnique({ where: { organizationId_inputHash: { organizationId, inputHash } } });
    if (!stored) return undefined;
    return { organizationId: stored.organizationId, conversationId: stored.conversationId, inputHash: stored.inputHash, model: stored.model, promptVersion: stored.promptVersion, analysis: conversationAnalysisSchema.parse(stored.analysis) };
  }

  async save(analysis: StoredAnalysis, usage: UsageRecord): Promise<void> {
    await this.database.$transaction(async (transaction) => {
      const stored = await transaction.aIAnalysis.upsert({
        where: { organizationId_inputHash: { organizationId: analysis.organizationId, inputHash: analysis.inputHash } },
        create: { ...analysis, analysis: analysis.analysis },
        update: {},
      });
      await transaction.usageRecord.upsert({
        where: { organizationId_inputHash_provider: { organizationId: usage.organizationId, inputHash: usage.inputHash, provider: this.providerName } },
        create: { organizationId: usage.organizationId, inputHash: usage.inputHash, provider: this.providerName, model: usage.model, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, quantity: usage.inputTokens + usage.outputTokens, metric: "ai.tokens", sourceType: "AIAnalysis", sourceId: stored.id },
        update: {},
      });
    }, { isolationLevel: "Serializable" });
  }
}

export class PrismaAnalysisRuntime {
  private readonly processor: AnalyzeConversationProcessor;

  constructor(private readonly database: DatabaseClient, provider: AIProvider, private readonly options: { model: string; promptVersion: string; providerName?: string }) {
    this.processor = new AnalyzeConversationProcessor(provider, new PrismaAnalysisStore(database, options.providerName ?? "unspecified"), options.model);
  }

  async process(job: AnalyzeConversationQueueJob): Promise<{ analysis: ConversationAnalysis; cached: boolean; lastInboundAt?: Date }> {
    const conversation = await this.database.conversation.findFirst({
      where: { id: job.conversationId, organizationId: job.organizationId },
      include: { messages: { orderBy: { occurredAt: "asc" } } },
    });
    if (!conversation) throw new Error("Conversation not found for tenant");
    const settings = await this.database.businessSettings.findUnique({ where: { organizationId: job.organizationId } });
    const result = await this.processor.process({
      organizationId: job.organizationId,
      conversationId: conversation.id,
      messages: conversation.messages.filter((message) => message.body !== null).map((message) => ({ direction: message.direction === "OUTBOUND" ? "OUTBOUND" as const : "INBOUND" as const, body: message.body!, occurredAt: message.occurredAt.toISOString() })),
      businessSettings: {
        ...(settings?.description ? { description: settings.description } : {}),
        ...(settings?.industry ? { industry: settings.industry } : {}),
        ...(settings?.tone ? { tone: settings.tone } : {}),
        ...(settings?.discountPolicy !== null && settings?.discountPolicy !== undefined ? { discountPolicy: settings.discountPolicy } : {}),
      },
      promptVersion: this.options.promptVersion,
    });
    const lastInboundAt = conversation.messages.filter((message) => message.direction === "INBOUND").at(-1)?.occurredAt;
    return { analysis: result.analysis, cached: result.cached, ...(lastInboundAt ? { lastInboundAt } : {}) };
  }
}
