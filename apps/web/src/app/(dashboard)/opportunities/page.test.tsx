import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { OpportunitiesView } from "./page.js";

describe("opportunities page", () => {
  it("shows known value, evidence and does not claim unproven revenue", () => {
    const html = renderToStaticMarkup(createElement(OpportunitiesView, { result: { status: "ready", items: [{ id: "opp-1", contactName: "Cliente A", type: "COMPANY_NO_RESPONSE", priority: "URGENT", status: "OPEN", knownValue: null, evidence: ["mensagem sem resposta"], ruleVersion: "opportunity-rules.v1" }] } }));
    expect(html).toContain("Oportunidades");
    expect(html).toContain("Valor conhecido");
    expect(html).toContain("Motivo identificado");
    expect(html).not.toContain("probabilidade de fechamento");
    expect(html).not.toContain("Receita recuperada");
    expect(html).toContain("Cliente A");
    expect(html).not.toContain("Lucas Costa");
  });
});
