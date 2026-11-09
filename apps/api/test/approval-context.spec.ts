import { describe, expect, it } from "vitest";

import { deriveApprovalContext } from "../src/modules/outbound/approval-context.js";

const now = new Date("2026-11-09T12:00:00.000Z");
const recent = new Date("2026-11-09T11:30:00.000Z");
const stale = new Date("2026-11-08T11:00:00.000Z");

const base = {
  consent: { status: "GRANTED", capturedAt: recent },
  lastInboundAt: recent,
  template: null,
  accountActive: true,
  actorCanApprove: true,
  lastOutboundAt: null,
  cooldownSeconds: undefined,
  now,
} as const;

describe("deriveApprovalContext", () => {
  it("aprova contexto completo dentro da janela", () => {
    expect(deriveApprovalContext(base)).toEqual({
      consentStatus: "GRANTED",
      optedOut: false,
      withinCustomerCareWindow: true,
      templateStatus: undefined,
      cooldownSatisfied: true,
      accountActive: true,
    });
  });

  it("trata consentimento revogado como opt-out", () => {
    expect(deriveApprovalContext({ ...base, consent: { status: "REVOKED", capturedAt: recent } })).toMatchObject({
      consentStatus: "REVOKED",
      optedOut: true,
    });
  });

  it("bloqueia quando não há consentimento registrado", () => {
    expect(deriveApprovalContext({ ...base, consent: null })).toMatchObject({
      consentStatus: "UNKNOWN",
      optedOut: false,
    });
  });

  it("fecha a janela após 24 horas sem inbound", () => {
    expect(deriveApprovalContext({ ...base, lastInboundAt: stale })).toMatchObject({
      withinCustomerCareWindow: false,
    });
  });

  it("considera a janela aberta exatamente no limite de 24 horas", () => {
    expect(deriveApprovalContext({ ...base, lastInboundAt: new Date("2026-11-08T12:00:00.000Z") })).toMatchObject({
      withinCustomerCareWindow: true,
    });
  });

  it("trata ausência de inbound como janela fechada", () => {
    expect(deriveApprovalContext({ ...base, lastInboundAt: null })).toMatchObject({
      withinCustomerCareWindow: false,
    });
    expect(deriveApprovalContext({ ...base, lastInboundAt: null, template: { status: "APPROVED" } })).toMatchObject({
      withinCustomerCareWindow: false,
      templateStatus: "APPROVED",
    });
  });

  it.each([
    ["APPROVED", "APPROVED"],
    ["PENDING", "PENDING"],
    ["REJECTED", "REJECTED"],
  ] as const)("mapeia template %s", (status, expected) => {
    expect(deriveApprovalContext({ ...base, template: { status } })).toMatchObject({
      templateStatus: expected,
    });
  });

  it("não inventa status para template desconhecido", () => {
    expect(deriveApprovalContext({ ...base, template: { status: "PAUSED" } })).toMatchObject({
      templateStatus: undefined,
    });
  });

  it("respeita cooldown somente quando configurado", () => {
    const lastOutboundAt = new Date("2026-11-09T11:59:30.000Z");
    expect(deriveApprovalContext({ ...base, lastOutboundAt, cooldownSeconds: 60 })).toMatchObject({
      cooldownSatisfied: false,
    });
    expect(deriveApprovalContext({ ...base, lastOutboundAt, cooldownSeconds: 30 })).toMatchObject({
      cooldownSatisfied: true,
    });
    expect(deriveApprovalContext({ ...base, lastOutboundAt })).toMatchObject({
      cooldownSatisfied: true,
    });
  });

  it("propaga conta inativa", () => {
    expect(deriveApprovalContext({ ...base, accountActive: false })).toMatchObject({
      accountActive: false,
    });
  });
});
