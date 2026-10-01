import type { OpenAIRequest, OpenAIResponseTransport, OpenAITransportResponse } from "./openai-provider.js";

type ResponsesPayload = {
  status?: string;
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string; refusal?: string }> }>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

export class FetchOpenAIResponseTransport implements OpenAIResponseTransport {
  private readonly fetcher: typeof fetch;
  private readonly baseUrl: string;

  constructor(private readonly options: { apiKey: string; fetcher?: typeof fetch; baseUrl?: string }) {
    if (!options.apiKey.trim()) throw new Error("OPENAI_API_KEY is required");
    this.fetcher = options.fetcher ?? fetch;
    this.baseUrl = (options.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
  }

  async create(request: OpenAIRequest, signal: AbortSignal): Promise<OpenAITransportResponse> {
    const response = await this.fetcher(`${this.baseUrl}/responses`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.options.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
    if (!response.ok) throw new Error(`OpenAI Responses API failed with status ${response.status}`);
    const payload = await response.json() as ResponsesPayload;
    const usage = { inputTokens: payload.usage?.input_tokens ?? 0, outputTokens: payload.usage?.output_tokens ?? 0 };
    const content = payload.output?.flatMap((item) => item.content ?? []) ?? [];
    const refusal = content.find((item) => item.type === "refusal")?.refusal;
    if (refusal) return { status: "refused", refusal, usage };
    const outputText = payload.output_text ?? content.filter((item) => item.type === "output_text").map((item) => item.text ?? "").join("");
    if (payload.status !== "completed" || !outputText) throw new Error("OpenAI response was not completed");
    return { status: "completed", outputText, usage };
  }
}
