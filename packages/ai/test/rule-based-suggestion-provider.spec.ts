import { describe, expect, it } from "vitest";

import { RuleBasedSuggestionProvider } from "../src/rule-based-suggestion-provider.js";
import type { GenerateSuggestionInput } from "../src/suggestion-provider.js";

const input: GenerateSuggestionInput = {
  opportunity: {
    type: "COMPANY_NO_RESPONSE",
    priority: "URGENT",
    evidence: ["mensagem do lead sem resposta da empresa há mais de 4 horas"],
    knownValue: null,
  },
  analysis: {
    intent: "PURCHASE",
    stage: "QUALIFYING",
    summary: "Cliente pediu detalhes do plano.",
    suggestedNextAction: "Responder ao cliente confirmando disponibilidade.",
  },
  businessSettings: { tone: "consultivo" },
  messages: [{ direction: "INBOUND", body: "Ainda está disponível?", occurredAt: "2026-11-09T10:00:00Z" }],
  promptVersion: "suggestion.v1",
};

describe("RuleBasedSuggestionProvider", () => {
  it("derives the suggestion from the analysis action and detection evidence", async () => {
    const result = await new RuleBasedSuggestionProvider().generateSuggestion(input);

    expect(result.suggestion).toEqual({
      content: "Responder agora: Responder ao cliente confirmando disponibilidade.",
      rationale: "COMPANY_NO_RESPONSE: mensagem do lead sem resposta da empresa há mais de 4 horas",
    });
    expect(result.usage).toEqual({ inputTokens: 0, outputTokens: 0 });
  });

  it("falls back to a neutral prefix and rationale when data is missing", async () => {
    const result = await new RuleBasedSuggestionProvider().generateSuggestion({
      ...input,
      opportunity: { ...input.opportunity, priority: "LOW", evidence: [] },
      analysis: { ...input.analysis, suggestedNextAction: "Retomar contato." },
    });

    expect(result.suggestion.content).toBe("Próximo passo: Retomar contato.");
    expect(result.suggestion.rationale).toBe("COMPANY_NO_RESPONSE: oportunidade comercial detectada.");
  });
});
