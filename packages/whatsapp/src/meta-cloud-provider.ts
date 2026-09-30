import type { ConnectionResult, SendInput, SendResult, WhatsAppProvider, WhatsAppTemplate } from "./whatsapp-provider.js";

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export class MetaCloudProvider implements WhatsAppProvider {
  constructor(
    private readonly graphVersion: string,
    private readonly accessToken: string,
    private readonly fetcher: Fetcher = fetch,
  ) {
    if (!graphVersion || graphVersion.includes("SET_")) throw new Error("A pinned Meta Graph API version is required");
  }

  async connect(): Promise<ConnectionResult> {
    throw new Error("Embedded Signup exchange requires a validated Meta test account");
  }

  async send(input: SendInput): Promise<SendResult> {
    const data = await this.request<{ messages?: Array<{ id: string }> }>(`${input.phoneNumberId}/messages`, {
      method: "POST",
      body: JSON.stringify({ messaging_product: "whatsapp", to: input.to, ...input.payload }),
    });
    const messageId = data.messages?.[0]?.id;
    if (!messageId) throw new Error("Meta response did not include a message id");
    return { messageId };
  }

  async getTemplates(businessAccountId: string): Promise<WhatsAppTemplate[]> {
    const data = await this.request<{ data?: WhatsAppTemplate[] }>(`${businessAccountId}/message_templates`);
    return data.data ?? [];
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetcher(`https://graph.facebook.com/${this.graphVersion}/${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.accessToken}`, "Content-Type": "application/json", ...init.headers },
    });
    if (!response.ok) throw new Error(`Meta Graph API request failed (${response.status})`);
    return response.json() as Promise<T>;
  }
}
