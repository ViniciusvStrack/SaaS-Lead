import { createHash } from "node:crypto";

import type { AIProvider, AnalysisResult, AnalyzeConversationInput, ConversationAnalysis } from "@saas-lead/ai";

export interface AnalyzeConversationJob extends AnalyzeConversationInput { organizationId: string }
export interface StoredAnalysis { organizationId: string; conversationId: string; inputHash: string; model: string; promptVersion: string; analysis: ConversationAnalysis }
export interface UsageRecord { organizationId: string; inputHash: string; model: string; inputTokens: number; outputTokens: number }

export interface AnalysisStore {
  findByHash(organizationId: string, inputHash: string): Promise<StoredAnalysis | undefined>;
  save(analysis: StoredAnalysis, usage: UsageRecord): Promise<void>;
}

export class InMemoryAnalysisStore implements AnalysisStore {
  analyses: StoredAnalysis[] = [];
  usageRecords: UsageRecord[] = [];
  async findByHash(organizationId: string, inputHash: string) { return this.analyses.find((item) => item.organizationId === organizationId && item.inputHash === inputHash); }
  async save(analysis: StoredAnalysis, usage: UsageRecord) { this.analyses.push(analysis); this.usageRecords.push(usage); }
}

export class AnalyzeConversationProcessor {
  constructor(private readonly provider: AIProvider, private readonly store: AnalysisStore, private readonly model: string) {}

  async process(job: AnalyzeConversationJob): Promise<AnalysisResult & { cached: boolean; inputHash: string }> {
    const inputHash = createHash("sha256").update(JSON.stringify({ conversationId: job.conversationId, messages: job.messages, businessSettings: job.businessSettings, promptVersion: job.promptVersion, model: this.model })).digest("hex");
    const cached = await this.store.findByHash(job.organizationId, inputHash);
    if (cached) return { analysis: cached.analysis, usage: { inputTokens: 0, outputTokens: 0 }, cached: true, inputHash };

    const result = await this.provider.analyzeConversation(job);
    const discountPolicy = job.businessSettings.discountPolicy;
    const discountConfigured = discountPolicy !== undefined && discountPolicy !== null;
    const safeAnalysis: ConversationAnalysis = discountConfigured ? result.analysis : {
      ...result.analysis,
      commercial: { ...result.analysis.commercial, discountAllowed: false, allowedDiscountPercent: null },
    };
    await this.store.save(
      { organizationId: job.organizationId, conversationId: job.conversationId, inputHash, model: this.model, promptVersion: job.promptVersion, analysis: safeAnalysis },
      { organizationId: job.organizationId, inputHash, model: this.model, ...result.usage },
    );
    return { analysis: safeAnalysis, usage: result.usage, cached: false, inputHash };
  }
}
