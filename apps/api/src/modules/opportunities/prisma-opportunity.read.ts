import type { DatabaseClient } from "@saas-lead/database";

export class PrismaOpportunityRead {
  constructor(private readonly database: DatabaseClient) {}

  async list(organizationId: string) {
    const rows = await this.database.opportunity.findMany({
      where: { organizationId },
      include: { conversation: { include: { contact: true } } },
      orderBy: [{ detectedAt: "desc" }, { id: "desc" }],
      take: 50,
    });
    return { items: rows.map(toView) };
  }

  async find(organizationId: string, id: string) {
    const row = await this.database.opportunity.findFirst({
      where: { id, organizationId },
      include: { conversation: { include: { contact: true } } },
    });
    return row ? toView(row) : undefined;
  }
}

function toView(row: {
  id: string;
  organizationId: string;
  conversationId: string;
  type: string;
  priority: string;
  status: string;
  knownValue: { toString(): string } | null;
  evidence: unknown;
  ruleVersion: string;
  detectedAt: Date;
  conversation: { contact: { displayName: string | null; externalContactId: string } };
}) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    conversationId: row.conversationId,
    contactName: row.conversation.contact.displayName ?? row.conversation.contact.externalContactId,
    type: row.type,
    priority: row.priority,
    status: row.status,
    knownValue: row.knownValue?.toString() ?? null,
    evidence: Array.isArray(row.evidence) ? row.evidence.filter((item): item is string => typeof item === "string") : [],
    ruleVersion: row.ruleVersion,
    detectedAt: row.detectedAt.toISOString(),
  };
}
