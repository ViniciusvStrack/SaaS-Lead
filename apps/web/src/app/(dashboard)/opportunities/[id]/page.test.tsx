import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import OpportunityDetailPage from "./page.js";

describe("opportunity detail", () => {
  it("mostra evidência, sugestão editável e aprovação humana", async () => {
    const html = renderToStaticMarkup(await OpportunityDetailPage({ params: Promise.resolve({ id: "opp-1" }) }));
    expect(html).toContain("Revisar oportunidade");
    expect(html).toContain("Por que identificamos");
    expect(html).toContain("Revisar antes de enviar");
    expect(html).toContain("Aprovar e enviar");
    expect(html).toContain("Dados demonstrativos");
  });
});
