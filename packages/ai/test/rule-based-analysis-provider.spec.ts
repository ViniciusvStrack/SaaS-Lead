import { describe, expect, it } from "vitest";
import { RuleBasedAnalysisProvider } from "../src/rule-based-analysis-provider.js";

describe("RuleBasedAnalysisProvider", () => {
  it("classifies explicit purchase intent locally without token usage", async () => {
    const provider = new RuleBasedAnalysisProvider();
    const result = await provider.analyzeConversation({ conversationId: "conversation-1", messages: [{ direction: "INBOUND", body: "Quero comprar. Pode me mandar uma proposta?", occurredAt: "2026-10-01T12:00:00Z" }], businessSettings: {}, promptVersion: "local-rules.v1" });
    expect(result).toEqual({
      analysis: { intent: "PURCHASE", stage: "READY_TO_BUY", sentiment: "NEUTRAL", urgency: 0.7, summary: "Cliente demonstrou intenção explícita de compra.", suggestedNextAction: "Responder ao cliente e avançar a negociação.", commercial: { discountRequested: false, discountAllowed: false, allowedDiscountPercent: null } },
      usage: { inputTokens: 0, outputTokens: 0 },
    });
  });

  it("never authorizes a discount from conversation text", async () => {
    const provider = new RuleBasedAnalysisProvider();
    const result = await provider.analyzeConversation({ conversationId: "conversation-1", messages: [{ direction: "INBOUND", body: "Quero 50% de desconto", occurredAt: "2026-10-01T12:00:00Z" }], businessSettings: {}, promptVersion: "local-rules.v1" });
    expect(result.analysis.commercial).toEqual({ discountRequested: true, discountAllowed: false, allowedDiscountPercent: null });
  });
});
