import type { AnalysisUsage } from "./ai-provider.js";
import type { Suggestion } from "./schemas/suggestion.js";

export interface SuggestionOpportunity {
  type: string;
  priority: string;
  evidence: readonly string[];
  knownValue: number | null;
}

export interface SuggestionAnalysis {
  intent: string;
  stage: string;
  summary: string;
  suggestedNextAction: string;
}

export interface GenerateSuggestionInput {
  opportunity: SuggestionOpportunity;
  analysis: SuggestionAnalysis;
  businessSettings: { description?: string; industry?: string; tone?: string; discountPolicy?: unknown };
  messages: Array<{ direction: "INBOUND" | "OUTBOUND"; body: string; occurredAt: string }>;
  promptVersion: string;
}

export interface SuggestionResult {
  suggestion: Suggestion;
  usage: AnalysisUsage;
}

export interface SuggestionProvider {
  generateSuggestion(input: GenerateSuggestionInput): Promise<SuggestionResult>;
}
