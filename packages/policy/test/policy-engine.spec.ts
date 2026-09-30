import { describe, expect, it } from "vitest";
import { PolicyEngine, type PolicyInput } from "../src/policy-engine.js";

const valid: PolicyInput = { consentStatus: "GRANTED", optedOut: false, withinCustomerCareWindow: true, templateStatus: undefined, cooldownSatisfied: true, accountActive: true, actorCanApprove: true, contentHash: "same", approvedContentHash: "same" };

describe("PolicyEngine", () => {
  const cases: Array<[string, Partial<PolicyInput>, string]> = [
    ["opt-out", { optedOut: true }, "OPTED_OUT"],
    ["consentimento ausente", { consentStatus: "UNKNOWN" }, "CONSENT_REQUIRED"],
    ["janela fechada sem template", { withinCustomerCareWindow: false }, "APPROVED_TEMPLATE_REQUIRED"],
    ["template pendente", { withinCustomerCareWindow: false, templateStatus: "PENDING" }, "APPROVED_TEMPLATE_REQUIRED"],
    ["cooldown", { cooldownSatisfied: false }, "COOLDOWN_ACTIVE"],
    ["conta inativa", { accountActive: false }, "ACCOUNT_INACTIVE"],
    ["permissão insuficiente", { actorCanApprove: false }, "INSUFFICIENT_PERMISSION"],
    ["conteúdo editado", { contentHash: "changed" }, "CONTENT_CHANGED"],
    ["contexto desconhecido", { cooldownSatisfied: undefined }, "CONTEXT_UNKNOWN"],
  ];
  it.each(cases)("bloqueia %s", (_name, change, reason) => {
    expect(new PolicyEngine().evaluate({ ...valid, ...change })).toMatchObject({ decision: "BLOCKED", reasons: expect.arrayContaining([reason]), policyVersion: "outbound-policy.v1" });
  });
  it("aprova contexto conhecido dentro da janela", () => {
    expect(new PolicyEngine().evaluate(valid)).toEqual({ decision: "APPROVED", reasons: [], policyVersion: "outbound-policy.v1" });
  });
  it("aprova fora da janela somente com template aprovado", () => {
    expect(new PolicyEngine().evaluate({ ...valid, withinCustomerCareWindow: false, templateStatus: "APPROVED" }).decision).toBe("APPROVED");
  });
});
