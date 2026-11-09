import { describe, expect, it } from "vitest";

import { parseApproveInput } from "../src/modules/outbound/outbound.controller.js";

describe("parseApproveInput", () => {
  it("normaliza o body aceito", () => {
    expect(
      parseApproveInput({
        conversationId: " conv-1 ",
        opportunityId: "opp-1",
        suggestionId: "sug-1",
        content: "  Olá  ",
        idempotencyKey: " approve-1 ",
        templateId: "template-1",
      }),
    ).toEqual({
      conversationId: "conv-1",
      opportunityId: "opp-1",
      suggestionId: "sug-1",
      content: "  Olá  ",
      idempotencyKey: "approve-1",
      templateId: "template-1",
    });
  });

  it("mantém espaços internos do conteúdo (não trim content)", () => {
    expect(parseApproveInput({ conversationId: "conv-1", content: "  Olá  ", idempotencyKey: "k" }).content).toBe(
      "  Olá  ",
    );
  });

  it("ignora o contexto enviado pelo cliente", () => {
    const parsed = parseApproveInput({
      conversationId: "conv-1",
      content: "Olá",
      idempotencyKey: "approve-1",
      context: { consentStatus: "GRANTED", optedOut: false },
    });

    expect(parsed).not.toHaveProperty("context");
  });

  it.each([
    ["conversationId", { content: "Olá", idempotencyKey: "k" }],
    ["content", { conversationId: "conv-1", idempotencyKey: "k" }],
    ["idempotencyKey", { conversationId: "conv-1", content: "Olá" }],
  ])("rejeita body sem %s", (field, body) => {
    expect(() => parseApproveInput(body)).toThrow(field);
  });

  it("rejeita conteúdo vazio", () => {
    expect(() => parseApproveInput({ conversationId: "conv-1", content: "   ", idempotencyKey: "k" })).toThrow(
      "content",
    );
  });

  it("rejeita body que não é objeto", () => {
    expect(() => parseApproveInput(null)).toThrow("body");
    expect(() => parseApproveInput("texto")).toThrow("body");
  });

  it("rejeita campos opcionais com tipo errado", () => {
    expect(() =>
      parseApproveInput({ conversationId: "conv-1", content: "Olá", idempotencyKey: "k", opportunityId: 1 }),
    ).toThrow("opportunityId");
    expect(() =>
      parseApproveInput({ conversationId: "conv-1", content: "Olá", idempotencyKey: "k", suggestionId: {} }),
    ).toThrow("suggestionId");
    expect(() =>
      parseApproveInput({ conversationId: "conv-1", content: "Olá", idempotencyKey: "k", templateId: 1 }),
    ).toThrow("templateId");
  });
});
