import type { ConversationAnalysis } from "./schemas/conversation-analysis.js";

export interface AnalyzeConversationInput {
  conversationId: string;
  messages: Array<{ direction: "INBOUND" | "OUTBOUND"; body: string; occurredAt: string }>;
  businessSettings: { description?: string; industry?: string; tone?: string; discountPolicy?: unknown };
  promptVersion: string;
}

export interface AnalysisUsage { inputTokens: number; outputTokens: number }
export interface AnalysisResult { analysis: ConversationAnalysis; usage: AnalysisUsage }

export interface AIProvider {
  analyzeConversation(input: AnalyzeConversationInput): Promise<AnalysisResult>;
}
