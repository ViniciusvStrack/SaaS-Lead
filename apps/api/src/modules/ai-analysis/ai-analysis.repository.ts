import type { ConversationAnalysis } from "@saas-lead/ai";
import type { TenantContext } from "@saas-lead/database";

export interface AIAnalysisView { conversationId: string; promptVersion: string; model: string; analysis: ConversationAnalysis; createdAt: Date }

export abstract class AIAnalysisRepository {
  abstract findLatest(tenant: TenantContext, conversationId: string): Promise<AIAnalysisView | undefined>;
}
