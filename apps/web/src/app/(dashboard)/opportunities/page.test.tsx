import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";

import OpportunitiesPage from "./page.js";

describe("opportunities page", () => {
  it("shows known value, evidence and does not claim unproven revenue", () => {
    const html = renderToStaticMarkup(createElement(OpportunitiesPage));
    expect(html).toContain("Oportunidades");
    expect(html).toContain("Valor conhecido");
    expect(html).toContain("Motivo identificado");
    expect(html).not.toContain("probabilidade de fechamento");
    expect(html).not.toContain("Receita recuperada");
  });
});
