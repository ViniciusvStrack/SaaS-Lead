import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { OpportunityDetailView } from "./page.js";
import type { OpportunityItem } from "../../../../lib/opportunities";

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("opportunity detail", () => {
  it("mostra evidência real sem controles de envio fictícios", () => {
    const item: OpportunityItem = {
      id: "opp-1",
      contactName: "Cliente A",
      type: "COMPANY_NO_RESPONSE",
      priority: "URGENT",
      status: "OPEN",
      knownValue: null,
      evidence: ["mensagem sem resposta"],
      ruleVersion: "opportunity-rules.v1",
      conversationId: "conv-1",
    };

    const { container } = render(
      <OpportunityDetailView result={{ status: "ready", item: item }} />,
    );
    expect(container).toHaveTextContent("Cliente A");
    expect(container).toHaveTextContent("Por que identificamos");
    expect(container).toHaveTextContent("mensagem sem resposta");
    expect(container).toHaveTextContent("Ainda não há sugestão");
    expect(screen.queryByText("Aprovar e enviar")).not.toBeInTheDocument();
  });

  it("mostra a sugestão de próxima ação quando o worker já gerou", () => {
    const item: OpportunityItem = {
      id: "opp-1",
      contactName: "Cliente A",
      type: "COMPANY_NO_RESPONSE",
      priority: "URGENT",
      status: "OPEN",
      knownValue: null,
      evidence: ["mensagem sem resposta"],
      ruleVersion: "opportunity-rules.v1",
      conversationId: "conv-1",
      suggestion: {
        content: "Responder agora confirmando disponibilidade.",
        status: "DRAFT",
        createdAt: "2026-11-09T12:05:00.000Z",
      },
    };

    const { container } = render(
      <OpportunityDetailView result={{ status: "ready", item: item }} />,
    );
    expect(container).toHaveTextContent("Responder agora confirmando disponibilidade.");
    expect(container).toHaveTextContent("Sugestão gerada pela IA (rascunho)");
    expect(screen.getByText("Aprovar e enviar")).toBeInTheDocument();
  });

  it("chama a API de aprovação com os dados da sugestão ao clicar no botão", async () => {
    let receivedBody: unknown = null;
    vi.stubGlobal(
      "fetch",
      async (_url: Parameters<typeof fetch>[0], init: Parameters<typeof fetch>[1]) => {
        receivedBody = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({ approved: true, id: "appr-1" }), { status: 201 });
      },
    );

    const item: OpportunityItem = {
      id: "opp-1",
      contactName: "Cliente A",
      type: "COMPANY_NO_RESPONSE",
      priority: "URGENT",
      status: "OPEN",
      knownValue: null,
      evidence: ["mensagem sem resposta"],
      ruleVersion: "opportunity-rules.v1",
      conversationId: "conv-1",
      suggestionId: "sug-1",
      suggestion: {
        content: "Responder agora.",
        status: "DRAFT",
        createdAt: "2026-11-09T12:05:00.000Z",
      },
    };

    render(<OpportunityDetailView result={{ status: "ready", item: item }} />);

    fireEvent.click(screen.getByText("Aprovar e enviar"));

    await waitFor(() => expect(receivedBody).not.toBeNull());

    expect(receivedBody).toEqual({
      conversationId: "conv-1",
      content: "Responder agora.",
      idempotencyKey: "approve-opp-1-sug-1",
      opportunityId: "opp-1",
      suggestionId: "sug-1",
    });
  });

  it("mostra estado de carregamento durante a requisição", async () => {
    vi.stubGlobal(
      "fetch",
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return new Response(JSON.stringify({ approved: true }), { status: 201 });
      },
    );

    const item: OpportunityItem = {
      id: "opp-1",
      contactName: "Cliente A",
      type: "COMPANY_NO_RESPONSE",
      priority: "URGENT",
      status: "OPEN",
      knownValue: null,
      evidence: ["mensagem sem resposta"],
      ruleVersion: "opportunity-rules.v1",
      conversationId: "conv-1",
      suggestion: {
        content: "Responder agora.",
        status: "DRAFT",
        createdAt: "2026-11-09T12:05:00.000Z",
      },
    };

    render(<OpportunityDetailView result={{ status: "ready", item: item }} />);

    fireEvent.click(screen.getByText("Aprovar e enviar"));

    expect(screen.getByText("Enviando…")).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText("Enviado ✓")).toBeInTheDocument());
  });

  it("mostra erro quando a API rejeita a aprovação", async () => {
    vi.stubGlobal(
      "fetch",
      async () => new Response(JSON.stringify({ error: "não autenticado" }), { status: 401 }),
    );

    const item: OpportunityItem = {
      id: "opp-1",
      contactName: "Cliente A",
      type: "COMPANY_NO_RESPONSE",
      priority: "URGENT",
      status: "OPEN",
      knownValue: null,
      evidence: ["mensagem sem resposta"],
      ruleVersion: "opportunity-rules.v1",
      conversationId: "conv-1",
      suggestion: {
        content: "Responder agora.",
        status: "DRAFT",
        createdAt: "2026-11-09T12:05:00.000Z",
      },
    };

    render(<OpportunityDetailView result={{ status: "ready", item: item }} />);

    fireEvent.click(screen.getByText("Aprovar e enviar"));

    await waitFor(() => expect(screen.getByText(/Erro 401 ao aprovar/)).toBeInTheDocument());
  });

  it("mostra erro quando a requisição falha", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("rede caiu");
    });

    const item: OpportunityItem = {
      id: "opp-1",
      contactName: "Cliente A",
      type: "COMPANY_NO_RESPONSE",
      priority: "URGENT",
      status: "OPEN",
      knownValue: null,
      evidence: ["mensagem sem resposta"],
      ruleVersion: "opportunity-rules.v1",
      conversationId: "conv-1",
      suggestion: {
        content: "Responder agora.",
        status: "DRAFT",
        createdAt: "2026-11-09T12:05:00.000Z",
      },
    };

    render(<OpportunityDetailView result={{ status: "ready", item: item }} />);

    fireEvent.click(screen.getByText("Aprovar e enviar"));

    await waitFor(() =>
      expect(screen.getByText(/Falha ao comunicar com o servidor/)).toBeInTheDocument(),
    );
  });
});
