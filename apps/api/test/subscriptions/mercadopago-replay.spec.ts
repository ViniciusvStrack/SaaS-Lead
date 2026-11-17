import { describe, expect, it } from "vitest";
import { validateMercadoPagoEventTimestamp } from "../../src/modules/subscriptions/mercadopago.provider.js";

// -------- unidade: validação de timestamp de eventos Mercado Pago --------

const referenceTime = Date.now();
const fiveMinutesMs = 5 * 60 * 1000;
const tenMinutesMs = 10 * 60 * 1000;

const agora = new Date(referenceTime).toISOString();
const dezMinutosPassado = new Date(referenceTime - tenMinutesMs).toISOString();
const dezMinutosFuturo = new Date(referenceTime + tenMinutesMs).toISOString();
const exatamenteCincoMinutosPassado = new Date(referenceTime - fiveMinutesMs).toISOString();

function validate(dateCreated: unknown) {
  return validateMercadoPagoEventTimestamp(dateCreated, {}, referenceTime);
}

describe("validateMercadoPagoEventTimestamp (proteção contra replay temporal)", () => {
  it("aceita date_created válido próximo ao agora (webhook aceito)", () => {
    const result = validate(agora);
    expect(result.valid).toBe(true);
  });

  it("aceita date_created com exatamente 5 minutos de atraso (limite inclusivo)", () => {
    const result = validate(exatamenteCincoMinutosPassado);
    expect(result.valid).toBe(true);
  });

  it("rejeita date_created 10 minutos no passado (replay)", () => {
    const result = validate(dezMinutosPassado);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("old");
  });

  it("rejeita date_created 10 minutos no futuro", () => {
    const result = validate(dezMinutosFuturo);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("future");
  });

  it("rejeita webhook sem date_created (data inválida)", () => {
    const result = validate(undefined);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("required");
  });

  it("rejeita date_created null (data inválida)", () => {
    const result = validate(null);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("required");
  });

  it("rejeita date_created string inválida", () => {
    const result = validate("not-a-date");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("invalid");
  });

  it("rejeita date_created string vazia (data inválida)", () => {
    const result = validate("");
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("required");
  });
});
