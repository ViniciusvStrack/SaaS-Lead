import { describe, expect, it } from "vitest";
import { FetchOpenAIResponseTransport } from "../src/fetch-openai-transport.js";

describe("FetchOpenAIResponseTransport", () => {
  it("sends a private Responses API request and returns structured text usage", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher: typeof fetch = async (url, init) => {
      requests.push({ url: String(url), init });
      return new Response(JSON.stringify({ status: "completed", output_text: "{\"intent\":\"PURCHASE\"}", usage: { input_tokens: 12, output_tokens: 5 } }), { status: 200, headers: { "content-type": "application/json" } });
    };
    const transport = new FetchOpenAIResponseTransport({ apiKey: "private-key", fetcher });
    const request = { model: "commercial-model", store: false as const, input: "analyze", text: { format: { type: "json_schema" as const, name: "conversation_analysis" as const, strict: true as const, schema: { type: "object" as const, additionalProperties: false as const, required: [], properties: {} } } } };

    await expect(transport.create(request, new AbortController().signal)).resolves.toEqual({ status: "completed", outputText: "{\"intent\":\"PURCHASE\"}", usage: { inputTokens: 12, outputTokens: 5 } });
    expect(requests[0]?.url).toBe("https://api.openai.com/v1/responses");
    expect(requests[0]?.init?.headers).toMatchObject({ Authorization: "Bearer private-key", "Content-Type": "application/json" });
    expect(JSON.parse(String(requests[0]?.init?.body))).toMatchObject({ model: "commercial-model", store: false });
  });

  it("does not leak the provider response body when HTTP fails", async () => {
    const fetcher: typeof fetch = async () => new Response("secret provider detail", { status: 401 });
    const transport = new FetchOpenAIResponseTransport({ apiKey: "private-key", fetcher });
    const request = { model: "commercial-model", store: false as const, input: "analyze", text: { format: { type: "json_schema" as const, name: "conversation_analysis" as const, strict: true as const, schema: { type: "object" as const, additionalProperties: false as const, required: [], properties: {} } } } };
    await expect(transport.create(request, new AbortController().signal)).rejects.not.toThrow("secret provider detail");
  });
});
