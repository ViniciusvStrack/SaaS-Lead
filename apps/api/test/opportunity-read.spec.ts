import { describe, expect, it, vi } from "vitest";
import type { DatabaseClient } from "@saas-lead/database";
import { PrismaOpportunityRead } from "../src/modules/opportunities/prisma-opportunity.read.js";

const detectedAt = new Date("2026-11-09T12:00:00Z");
const suggestionAt = new Date("2026-11-09T12:05:00Z");

function row(overrides: { editedContent?: string | null } = {}) {
  return {
    id: "opp-1",
    organizationId: "org-a",
    conversationId: "conversation-1",
    type: "COMPANY_NO_RESPONSE",
    priority: "URGENT",
    status: "OPEN",
    knownValue: null,
    evidence: ["sem resposta", 42, "cliente quente"],
    ruleVersion: "opportunity-rules.v1",
    detectedAt,
    conversation: { contact: { displayName: "Cliente A", externalContactId: "wa-1" } },
    suggestions: [
      {
        content: "Responder agora pelo WhatsApp.",
        editedContent: overrides.editedContent ?? null,
        status: "DRAFT",
        createdAt: suggestionAt,
      },
    ],
  };
}

function fakeDatabase(listValue: unknown, findValue: unknown = Array.isArray(listValue) ? listValue[0] : listValue) {
  const opportunity = {
    findMany: vi.fn(async (args: unknown) => { void args; return listValue; }),
    findFirst: vi.fn(async (args: unknown) => { void args; return findValue; }),
  };
  return { database: { opportunity } as unknown as DatabaseClient, opportunity };
}

describe("PrismaOpportunityRead", () => {
  it("returns the latest suggestion as the next action", async () => {
    const { database } = fakeDatabase([row()]);
    const result = await new PrismaOpportunityRead(database).list("org-a");

    expect(result.items[0]).toMatchObject({
      contactName: "Cliente A",
      evidence: ["sem resposta", "cliente quente"],
      suggestion: {
        content: "Responder agora pelo WhatsApp.",
        status: "DRAFT",
        createdAt: suggestionAt.toISOString(),
      },
    });
  });

  it("prefers the human-edited suggestion text when present", async () => {
    const { database } = fakeDatabase(row({ editedContent: "Responder hoje com o valor revisado." }));
    const result = await new PrismaOpportunityRead(database).find("org-a", "opp-1");

    expect(result?.suggestion?.content).toBe("Responder hoje com o valor revisado.");
  });

  it("returns null when there is no suggestion yet", async () => {
    const { database } = fakeDatabase({ ...row(), suggestions: [] });
    const result = await new PrismaOpportunityRead(database).find("org-a", "opp-1");

    expect(result?.suggestion).toBeNull();
  });

  it("scopes every query by tenant", async () => {
    const { database, opportunity } = fakeDatabase([row()]);
    await new PrismaOpportunityRead(database).list("org-a");
    await new PrismaOpportunityRead(database).find("org-a", "opp-1");

    expect(opportunity.findMany.mock.calls[0]?.[0]).toMatchObject({ where: { organizationId: "org-a" } });
    expect(opportunity.findFirst.mock.calls[0]?.[0]).toMatchObject({ where: { id: "opp-1", organizationId: "org-a" } });
  });
});
