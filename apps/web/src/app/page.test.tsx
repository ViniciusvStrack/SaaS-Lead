import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";

import HomePage from "./page.js";

describe("commercial dashboard", () => {
  it("renders a navigable demo dashboard with honest commercial metrics", () => {
    const html = renderToStaticMarkup(createElement(HomePage));
    expect(html).toContain("Visão geral");
    expect(html).toContain("Dados demonstrativos");
    expect(html).toContain("Oportunidades ativas");
    expect(html).toContain("Conversas recentes");
    expect(html).toContain('href="/opportunities/opp-1"');
    expect(html).not.toContain("Receita recuperada");
  });
});
