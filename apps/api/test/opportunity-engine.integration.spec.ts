import { describe, expect, it } from "vitest";

import { OpportunityEngine } from "../src/modules/opportunities/opportunity.engine.js";

const now = new Date("2026-09-30T12:00:00Z");
const base = {
  organizationId: "org-a",
  conversationId: "conversation-1",
  analysis: { intent: "PURCHASE" as const, stage: "QUALIFYING" as const, urgency: 0.7 },
  now,
};

describe("OpportunityEngine", () => {
  const engine = new OpportunityEngine();

  it("detects an abandoned quote with known value and evidence", () => {
    const result = engine.detect({ ...base, quoteSentAt: new Date("2026-09-27T10:00:00Z"), lastInboundAt: new Date("2026-09-27T09:00:00Z"), quotedAmount: 4900 });
    expect(result).toEqual([expect.objectContaining({ type: "QUOTE_ABANDONED", knownValue: 4900, priority: "HIGH", evidence: expect.arrayContaining([expect.stringContaining("proposta")]) })]);
    expect(result[0]).not.toHaveProperty("closeProbability");
  });

  it("detects a ghosted lead without inventing monetary value", () => {
    const result = engine.detect({ ...base, lastOutboundAt: new Date("2026-09-26T12:00:00Z"), lastInboundAt: new Date("2026-09-26T10:00:00Z") });
    expect(result).toEqual([expect.objectContaining({ type: "LEAD_GHOSTED", knownValue: null, evidence: expect.arrayContaining([expect.stringContaining("resposta enviada")]) })]);
  });

  it("detects when the company has not answered an inbound lead", () => {
    const result = engine.detect({ ...base, lastInboundAt: new Date("2026-09-30T06:00:00Z") });
    expect(result).toEqual([expect.objectContaining({ type: "COMPANY_NO_RESPONSE", priority: "URGENT", evidence: expect.arrayContaining([expect.stringContaining("sem resposta")]) })]);
  });

  it("returns a stable identity for duplicate detection runs", () => {
    const input = { ...base, quoteSentAt: new Date("2026-09-27T10:00:00Z"), lastInboundAt: new Date("2026-09-27T09:00:00Z") };
    expect(engine.detect(input)[0]?.deduplicationKey).toBe(engine.detect(input)[0]?.deduplicationKey);
  });

  it("does not classify a support conversation as a commercial lead", () => {
    expect(engine.detect({ ...base, analysis: { intent: "SUPPORT", stage: "NEW", urgency: 0.7 }, lastInboundAt: new Date("2026-09-30T06:00:00Z") })).toEqual([]);
  });

  it("does not flag an unanswered lead after the company has replied", () => {
    expect(engine.detect({ ...base, lastInboundAt: new Date("2026-09-30T06:00:00Z"), lastOutboundAt: new Date("2026-09-30T07:00:00Z") })).toEqual([]);
  });
});
