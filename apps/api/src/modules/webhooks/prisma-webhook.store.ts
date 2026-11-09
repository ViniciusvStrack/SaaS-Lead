import type { DatabaseClient } from "@saas-lead/database";
import type { InboxEvent, InboxStore, NumberDirectory } from "./webhook-inbox.js";

export class PrismaWebhookStore implements InboxStore, NumberDirectory {
  constructor(private readonly database: DatabaseClient) {}

  async findOrganizationId(phoneNumberId: string): Promise<string | undefined> {
    const number = await this.database.whatsAppNumber.findFirst({
      where: { externalNumberId: phoneNumberId, status: "ACTIVE", organization: { status: "ACTIVE" } },
      select: { organizationId: true },
    });
    return number?.organizationId;
  }

  async insert(event: InboxEvent): Promise<"inserted" | "duplicate"> {
    try {
      await this.database.webhookEvent.create({
        data: {
          externalId: event.externalId,
          organizationId: event.organizationId,
          numberId: await this.resolveNumberId(event.phoneNumberId, event.organizationId),
          payload: event.payload as object,
        },
      });
      return "inserted";
    } catch (error) {
      if (isUniqueViolation(error)) return "duplicate";
      throw error;
    }
  }

  private async resolveNumberId(phoneNumberId: string, organizationId: string): Promise<string> {
    const number = await this.database.whatsAppNumber.findFirst({
      where: { externalNumberId: phoneNumberId, organizationId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!number) throw new Error("WhatsApp number not found for organization");
    return number.id;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
