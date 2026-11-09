import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OpportunityDetailView } from "./page.js";

describe("opportunity detail", () => {
  it("mostra evidência real sem controles de envio fictícios", () => {
    const html = renderToStaticMarkup(<OpportunityDetailView result={{ status: "ready", item: { id: "opp-1", contactName: "Cliente A", type: "COMPANY_NO_RESPONSE", priority: "URGENT", status: "OPEN", knownValue: null, evidence: ["mensagem sem resposta"], ruleVersion: "opportunity-rules.v1" } }} />);
    expect(html).toContain("Cliente A");
    expect(html).toContain("Por que identificamos");
    expect(html).toContain("mensagem sem resposta");
    expect(html).toContain("Ainda não há sugestão");
    expect(html).not.toContain("Aprovar e enviar");
  });

  it("mostra a sugestão de próxima ação quando o worker já gerou", () => {
    const html = renderToStaticMarkup(<OpportunityDetailView result={{ status: "ready", item: { id: "opp-1", contactName: "Cliente A", type: "COMPANY_NO_RESPONSE", priority: "URGENT", status: "OPEN", knownValue: null, evidence: ["mensagem sem resposta"], ruleVersion: "opportunity-rules.v1", suggestion: { content: "Responder agora confirmando disponibilidade.", status: "DRAFT", createdAt: "2026-11-09T12:05:00.000Z" } } }} />);
    expect(html).toContain("Responder agora confirmando disponibilidade.");
    expect(html).toContain("Sugestão gerada pela IA (rascunho)");
    expect(html).not.toContain("Aprovar e enviar");
  });
});
