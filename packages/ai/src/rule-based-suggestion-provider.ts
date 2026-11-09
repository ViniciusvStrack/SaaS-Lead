import type { GenerateSuggestionInput, SuggestionProvider, SuggestionResult } from "./suggestion-provider.js";

const urgencyPrefix: Readonly<Record<string, string>> = {
  URGENT: "Responder agora",
  HIGH: "Responder hoje",
  MEDIUM: "Retomar nesta semana",
};

/**
 * Deterministic fallback used when no AI provider is configured.
 * It never invents commercial terms: the content is the analysis action,
 * and the rationale restates the detection evidence.
 */
export class RuleBasedSuggestionProvider implements SuggestionProvider {
  async generateSuggestion(input: GenerateSuggestionInput): Promise<SuggestionResult> {
    const prefix = urgencyPrefix[input.opportunity.priority] ?? "Próximo passo";
    const action = input.analysis.suggestedNextAction.trim();
    const evidence = input.opportunity.evidence[0]?.trim();
    return {
      suggestion: {
        content: `${prefix}: ${action}`,
        rationale: evidence
          ? `${input.opportunity.type}: ${evidence}`
          : `${input.opportunity.type}: oportunidade comercial detectada.`,
      },
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }
}
