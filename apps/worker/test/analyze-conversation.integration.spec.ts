import { describe, expect, it } from "vitest";

import { AnalyzeConversationProcessor, InMemoryAnalysisStore } from "../src/processors/analyze-conversation.processor.js";

const analysis = {
  intent: "PURCHASE" as const,
  stage: "QUALIFYING" as const,
  sentiment: "POSITIVE" as const,
  urgency: 0.5,
  summary: "Lead interessado.",
  suggestedNextAction: "Qualificar necessidade.",
  commercial: { discountRequested: true, discountAllowed: true, allowedDiscountPercent: 10 },
};

describe("AnalyzeConversationProcessor", () => {
  it("caches by input hash and records usage only once", async () => {
    let calls = 0;
    const provider = { analyzeConversation: async () => { calls += 1; return { analysis, usage: { inputTokens: 100, outputTokens: 40 } }; } };
    const store = new InMemoryAnalysisStore();
    const processor = new AnalyzeConversationProcessor(provider, store, "gpt-6-astra");
    const job = { organizationId: "org-a", conversationId: "conversation-1", messages: [{ direction: "INBOUND" as const, body: "Quero comprar", occurredAt: "2026-09-30T12:00:00Z" }], businessSettings: {}, promptVersion: "v1" };

    await processor.process(job);
    await processor.process(job);

    expect(calls).toBe(1);
    expect(store.analyses).toHaveLength(1);
    expect(store.usageRecords).toHaveLength(1);
  });

  it("removes an invented discount when business settings do not allow one", async () => {
    const provider = { analyzeConversation: async () => ({ analysis, usage: { inputTokens: 10, outputTokens: 10 } }) };
    const store = new InMemoryAnalysisStore();
    const processor = new AnalyzeConversationProcessor(provider, store, "gpt-6-astra");

    const result = await processor.process({ organizationId: "org-a", conversationId: "conversation-1", messages: [], businessSettings: {}, promptVersion: "v1" });

    expect(result.analysis.commercial).toEqual({ discountRequested: true, discountAllowed: false, allowedDiscountPercent: null });
  });
});
