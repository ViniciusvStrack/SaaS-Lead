import { createHash } from "node:crypto";

import { conversationAnalysisSchema, type SuggestionProvider } from "@saas-lead/ai";
import type { DatabaseClient } from "@saas-lead/database";

export interface GenerateSuggestionJob {
  organizationId: string;
  conversationId: string;
}

export interface GeneratedSuggestion {
  id: string;
  content: string;
  cached: boolean;
}

/**
 * Loads the latest commercial context for a conversation, asks the configured
 * suggestion provider for the next action and persists it as `AISuggestion`.
 *
 * The operation is idempotent per (opportunity, analysis): redelivered jobs
 * reuse the stored suggestion instead of paying for another model call.
 */
export class PrismaSuggestionRuntime {
  constructor(
    private readonly database: DatabaseClient,
    private readonly provider: SuggestionProvider,
    private readonly options: { model: string; promptVersion: string; providerName?: string },
  ) {}

  async process(job: GenerateSuggestionJob): Promise<GeneratedSuggestion | undefined> {
    const conversation = await this.database.conversation.findFirst({
      where: { id: job.conversationId, organizationId: job.organizationId },
      include: { messages: { orderBy: { occurredAt: "asc" } } },
    });
    if (!conversation) throw new Error("Conversation not found for tenant");

    const [storedAnalysis, opportunity, settings] = await Promise.all([
      this.database.aIAnalysis.findFirst({
        where: { organizationId: job.organizationId, conversationId: job.conversationId },
        orderBy: { createdAt: "desc" },
      }),
      this.database.opportunity.findFirst({
        where: { organizationId: job.organizationId, conversationId: job.conversationId, status: "OPEN" },
        orderBy: [{ detectedAt: "desc" }, { id: "desc" }],
      }),
      this.database.businessSettings.findUnique({ where: { organizationId: job.organizationId } }),
    ]);
    if (!storedAnalysis || !opportunity) return undefined;

    const existing = await this.database.aISuggestion.findFirst({
      where: { organizationId: job.organizationId, opportunityId: opportunity.id, analysisId: storedAnalysis.id },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      return { id: existing.id, content: existing.editedContent ?? existing.content, cached: true };
    }

    const analysis = conversationAnalysisSchema.safeParse(storedAnalysis.analysis);
    if (!analysis.success) return undefined;

    const providerName = this.options.providerName ?? "unspecified";
    const result = await this.provider.generateSuggestion({
      opportunity: {
        type: opportunity.type,
        priority: opportunity.priority,
        evidence: evidenceOf(opportunity.evidence),
        knownValue: opportunity.knownValue === null ? null : Number(opportunity.knownValue.toString()),
      },
      analysis: {
        intent: analysis.data.intent,
        stage: analysis.data.stage,
        summary: analysis.data.summary,
        suggestedNextAction: analysis.data.suggestedNextAction,
      },
      businessSettings: {
        ...(settings?.description ? { description: settings.description } : {}),
        ...(settings?.industry ? { industry: settings.industry } : {}),
        ...(settings?.tone ? { tone: settings.tone } : {}),
        ...(settings?.discountPolicy !== null && settings?.discountPolicy !== undefined
          ? { discountPolicy: settings.discountPolicy }
          : {}),
      },
      messages: conversation.messages
        .filter((message) => message.body !== null)
        .map((message) => ({
          direction: message.direction === "OUTBOUND" ? ("OUTBOUND" as const) : ("INBOUND" as const),
          body: message.body!,
          occurredAt: message.occurredAt.toISOString(),
        })),
      promptVersion: this.options.promptVersion,
    });

    const inputHash = createHash("sha256")
      .update(`suggestion:${opportunity.id}:${storedAnalysis.id}:${this.options.promptVersion}`)
      .digest("hex");

    return this.database.$transaction(
      async (transaction) => {
        const suggestion = await transaction.aISuggestion.create({
          data: {
            organizationId: job.organizationId,
            opportunityId: opportunity.id,
            analysisId: storedAnalysis.id,
            content: result.suggestion.content,
          },
        });
        await transaction.usageRecord.upsert({
          where: { organizationId_inputHash_provider: { organizationId: job.organizationId, inputHash, provider: providerName } },
          create: {
            organizationId: job.organizationId,
            inputHash,
            provider: providerName,
            model: this.options.model,
            inputTokens: result.usage.inputTokens,
            outputTokens: result.usage.outputTokens,
            quantity: result.usage.inputTokens + result.usage.outputTokens,
            metric: "ai.tokens",
            sourceType: "AISuggestion",
            sourceId: suggestion.id,
          },
          update: {},
        });
        return { id: suggestion.id, content: suggestion.content, cached: false };
      },
      { isolationLevel: "Serializable" },
    );
  }
}

function evidenceOf(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
