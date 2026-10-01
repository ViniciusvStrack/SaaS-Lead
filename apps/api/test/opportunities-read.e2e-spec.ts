import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { Test } from "@nestjs/testing";
import { createDatabaseClient } from "@saas-lead/database";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { OpportunitiesModule } from "../src/modules/opportunities/opportunities.module.js";
import { SessionService } from "../src/modules/auth/session.service.js";

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("TEST_DATABASE_URL or DATABASE_URL is required");
const database = createDatabaseClient(databaseUrl);
afterAll(async () => database.$disconnect());

describe("authenticated opportunities", () => {
  it("returns only the active organization's opportunities and hides another tenant's detail", async () => {
    const suffix = randomUUID();
    const orgA = await database.organization.create({ data: { name: "Tenant A", slug: `read-a-${suffix}` } });
    const orgB = await database.organization.create({ data: { name: "Tenant B", slug: `read-b-${suffix}` } });
    const user = await database.user.create({ data: { email: `read-${suffix}@example.test`, name: "Operator" } });
    await database.organizationMember.create({ data: { organizationId: orgA.id, userId: user.id, role: "AGENT" } });
    const createOpportunity = async (organizationId: string, label: string) => {
      const account = await database.whatsAppAccount.create({ data: { organizationId, externalAccountId: `${label}-account-${suffix}`, credentialReference: "ref" } });
      const number = await database.whatsAppNumber.create({ data: { organizationId, accountId: account.id, externalNumberId: `${label}-number-${suffix}` } });
      const contact = await database.contact.create({ data: { organizationId, externalContactId: `${label}-contact-${suffix}`, displayName: label } });
      const conversation = await database.conversation.create({ data: { organizationId, numberId: number.id, contactId: contact.id } });
      return database.opportunity.create({ data: { organizationId, conversationId: conversation.id, deduplicationKey: `${label}-${suffix}`, type: "COMPANY_NO_RESPONSE", priority: "URGENT", ruleVersion: "opportunity-rules.v1", evidence: ["sem resposta"] } });
    };
    const own = await createOpportunity(orgA.id, "Cliente A");
    const foreign = await createOpportunity(orgB.id, "Cliente B");
    const module = await Test.createTestingModule({ imports: [OpportunitiesModule] }).compile();
    const app = module.createNestApplication();
    await app.init();
    try {
      const token = await app.get(SessionService).create({ userId: user.id, organizationId: orgA.id, role: "AGENT", expiresAt: new Date(Date.now() + 60_000) });
      const storedSession = await database.session.findFirst({ where: { userId: user.id, organizationId: orgA.id } });
      expect(storedSession?.tokenHash).toBeDefined();
      expect(storedSession?.tokenHash).not.toBe(token);
      const cookie = `saas_lead_session=${token}`;
      const list = await request(app.getHttpServer()).get("/opportunities").set("Cookie", cookie).expect(200);
      expect(list.body.items).toEqual([expect.objectContaining({ id: own.id, contactName: "Cliente A", priority: "URGENT" })]);
      await request(app.getHttpServer()).get(`/opportunities/${foreign.id}`).set("Cookie", cookie).expect(404);
      await request(app.getHttpServer()).get(`/opportunities/${own.id}`).set("Cookie", cookie).expect(200);
      await request(app.getHttpServer()).get("/opportunities/not-a-uuid").set("Cookie", cookie).expect(400);
      await request(app.getHttpServer()).get("/opportunities").expect(401);
      await database.organizationMember.update({ where: { organizationId_userId: { organizationId: orgA.id, userId: user.id } }, data: { status: "SUSPENDED" } });
      await request(app.getHttpServer()).get("/opportunities").set("Cookie", cookie).expect(401);
    } finally {
      await app.close();
    }
  });
});
