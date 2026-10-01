import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ActivityPage from "./page.js";
describe("activity and privacy page", () => {
  it("distinguishes attributed revenue and exposes privacy controls", () => {
    const html = renderToStaticMarkup(<ActivityPage />);
    expect(html).toContain("Receita atribuída");
    expect(html).toContain("Valor sem atribuição");
    expect(html).toContain("Exportar dados");
    expect(html).toContain("Solicitar exclusão");
    expect(html).toContain("Dados demonstrativos");
  });
});
