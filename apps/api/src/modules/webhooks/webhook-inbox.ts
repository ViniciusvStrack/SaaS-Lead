import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export interface InboxEvent { externalId: string; organizationId: string; phoneNumberId: string; payload: unknown }
export interface InboxInsertResult { status: "inserted" | "duplicate"; eventId: string }
export interface InboxStore { insert(event: InboxEvent): Promise<InboxInsertResult> }
export interface NumberDirectory { findOrganizationId(phoneNumberId: string): Promise<string | undefined> }
export type AcceptResult =
  | { accepted: true; duplicate: boolean; eventId: string; organizationId: string }
  | { accepted: false; reason: string };

export class WebhookInbox {
  constructor(
    private readonly appSecret: string,
    private readonly numbers: NumberDirectory,
    private readonly store: InboxStore,
    private readonly maxBytes = 1024 * 1024,
  ) {}

  async accept(rawBody: Buffer, signature: string | undefined): Promise<AcceptResult> {
    if (rawBody.byteLength > this.maxBytes) return { accepted: false, reason: "payload_too_large" };
    if (!this.verifySignature(rawBody, signature)) return { accepted: false, reason: "invalid_signature" };
    let payload: unknown;
    try { payload = JSON.parse(rawBody.toString("utf8")); } catch { return { accepted: false, reason: "malformed_payload" }; }
    const identity = extractIdentity(payload);
    if (!identity) return { accepted: false, reason: "unsupported_payload" };
    const organizationId = await this.numbers.findOrganizationId(identity.phoneNumberId);
    if (!organizationId) return { accepted: false, reason: "unknown_phone_number" };
    const result = await this.store.insert({ ...identity, organizationId, payload });
    return { accepted: true, duplicate: result.status === "duplicate", eventId: result.eventId, organizationId };
  }

  private verifySignature(rawBody: Buffer, signature: string | undefined): boolean {
    if (!signature?.startsWith("sha256=")) return false;
    const hex = signature.slice(7);
    if (!/^[a-f\d]{64}$/i.test(hex)) return false;
    const supplied = Buffer.from(hex, "hex");
    const expected = createHmac("sha256", this.appSecret).update(rawBody).digest();
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  }
}

function extractIdentity(payload: unknown): { externalId: string; phoneNumberId: string } | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const root = payload as { entry?: Array<{ id?: string; changes?: Array<{ value?: { metadata?: { phone_number_id?: string }; messages?: Array<{ id?: string }> } }> }> };
  const value = root.entry?.[0]?.changes?.[0]?.value;
  const phoneNumberId = value?.metadata?.phone_number_id;
  const externalId = value?.messages?.[0]?.id ?? root.entry?.[0]?.id;
  return phoneNumberId && externalId ? { phoneNumberId, externalId } : undefined;
}

export class InMemoryInboxStore implements InboxStore {
  readonly events = new Map<string, InboxEvent>();
  private readonly ids = new Map<string, string>();
  async insert(event: InboxEvent): Promise<InboxInsertResult> {
    const existingId = this.ids.get(event.externalId);
    if (existingId) return { status: "duplicate", eventId: existingId };
    const eventId = randomUUID();
    this.events.set(event.externalId, event);
    this.ids.set(event.externalId, eventId);
    return { status: "inserted", eventId };
  }
}

export class InMemoryNumberDirectory implements NumberDirectory {
  constructor(private readonly numbers: Record<string, string>) {}
  async findOrganizationId(phoneNumberId: string): Promise<string | undefined> { return this.numbers[phoneNumberId]; }
}
