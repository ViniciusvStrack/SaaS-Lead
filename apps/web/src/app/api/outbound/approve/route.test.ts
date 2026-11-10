import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.API_BASE_URL;
});

function buildRequest(body: unknown, cookie?: string) {
  return new Request("http://web.test/api/outbound/approve", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/outbound/approve", () => {
  it("encaminha body e cookie da sessão para a API e retorna o status e JSON dela", async () => {
    process.env.API_BASE_URL = "http://api.test";
    let receivedUrl: string | undefined;
    let receivedInit: RequestInit | undefined;
    vi.stubGlobal(
      "fetch",
      async (url: Parameters<typeof fetch>[0], init: Parameters<typeof fetch>[1]) => {
        receivedUrl = String(url);
        receivedInit = init;
        return new Response(JSON.stringify({ approved: true, id: "appr-1" }), { status: 201 });
      }
    );

    const { POST } = await import("./route");
    const res = await POST(
      buildRequest(
        { conversationId: "conv-1", content: "Olá", idempotencyKey: "idem-1", opportunityId: "opp-1", suggestionId: "sug-1" },
        "saas_lead_session=abc123; other=x"
      )
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ approved: true, id: "appr-1" });
    expect(receivedUrl).toBe("http://api.test/outbound/approvals");
    expect(receivedInit?.method).toBe("POST");
    expect(receivedInit?.headers).toMatchObject({
      "Content-Type": "application/json",
      Cookie: "saas_lead_session=abc123",
    });
    expect(receivedInit?.body).toBe(
      JSON.stringify({ conversationId: "conv-1", content: "Olá", idempotencyKey: "idem-1", opportunityId: "opp-1", suggestionId: "sug-1" })
    );
  });

  it("sem cookie ainda encaminha a requisição (sem Cookie header); a API responde 401", async () => {
    process.env.API_BASE_URL = "http://api.test";
    let receivedInit: RequestInit | undefined;
    vi.stubGlobal(
      "fetch",
      async (_url: Parameters<typeof fetch>[0], init: Parameters<typeof fetch>[1]) => {
        receivedInit = init;
        return new Response(JSON.stringify({ error: "não autenticado" }), { status: 401 });
      }
    );

    const { POST } = await import("./route");
    const res = await POST(buildRequest({ conversationId: "conv-1", content: "Olá", idempotencyKey: "idem-1" }));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "não autenticado" });
    expect(receivedInit?.headers).not.toHaveProperty("Cookie");
  });

  it("body sem conversationId retorna 400 sem chamar a API", async () => {
    process.env.API_BASE_URL = "http://api.test";
    let fetchCalled = false;
    vi.stubGlobal(
      "fetch",
      async () => {
        fetchCalled = true;
        return new Response("não deve ser chamado", { status: 500 });
      }
    );

    const { POST } = await import("./route");
    const res = await POST(buildRequest({ content: "Olá", idempotencyKey: "idem-1" }));

    expect(res.status).toBe(400);
    expect(fetchCalled).toBe(false);
  });

  it("body sem content retorna 400 sem chamar a API", async () => {
    process.env.API_BASE_URL = "http://api.test";
    let fetchCalled = false;
    vi.stubGlobal(
      "fetch",
      async () => {
        fetchCalled = true;
        return new Response("não deve ser chamado", { status: 500 });
      }
    );

    const { POST } = await import("./route");
    const res = await POST(buildRequest({ conversationId: "conv-1", idempotencyKey: "idem-1" }));

    expect(res.status).toBe(400);
    expect(fetchCalled).toBe(false);
  });

  it("body sem idempotencyKey retorna 400 sem chamar a API", async () => {
    process.env.API_BASE_URL = "http://api.test";
    let fetchCalled = false;
    vi.stubGlobal(
      "fetch",
      async () => {
        fetchCalled = true;
        return new Response("não deve ser chamado", { status: 500 });
      }
    );

    const { POST } = await import("./route");
    const res = await POST(buildRequest({ conversationId: "conv-1", content: "Olá" }));

    expect(res.status).toBe(400);
    expect(fetchCalled).toBe(false);
  });

  it("API_BASE_URL ausente retorna 500 sem chamar a API", async () => {
    delete process.env.API_BASE_URL;
    let fetchCalled = false;
    vi.stubGlobal(
      "fetch",
      async () => {
        fetchCalled = true;
        return new Response("não deve ser chamado", { status: 500 });
      }
    );

    const { POST } = await import("./route");
    const res = await POST(buildRequest({ conversationId: "conv-1", content: "Olá", idempotencyKey: "idem-1" }));

    expect(res.status).toBe(500);
    expect(fetchCalled).toBe(false);
  });

  it("falha de rede (fetch lança) retorna 502", async () => {
    process.env.API_BASE_URL = "http://api.test";
    vi.stubGlobal(
      "fetch",
      async () => {
        throw new TypeError("falha de rede");
      }
    );

    const { POST } = await import("./route");
    const res = await POST(buildRequest({ conversationId: "conv-1", content: "Olá", idempotencyKey: "idem-1" }));

    expect(res.status).toBe(502);
  });
});
