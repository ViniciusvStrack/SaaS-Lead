import { BadRequestException, Body, Controller, Get, Headers, Inject, Post, UnauthorizedException } from "@nestjs/common";
import type { DatabaseClient } from "@saas-lead/database";
import { createTenantContext } from "@saas-lead/database";
import { SessionService } from "../auth/session.service.js";

@Controller("whatsapp")
export class WhatsAppController {
  constructor(@Inject("WHATSAPP_DATABASE") private readonly database: DatabaseClient, private readonly sessions: SessionService) {}

  @Get("connections")
  async connections(@Headers("cookie") cookie?: string) {
    const organizationId = await this.organizationId(cookie);
    return this.database.whatsAppAccount.findMany({ where: { organizationId }, include: { numbers: { select: { id: true, externalNumberId: true, displayNumber: true, status: true } } }, orderBy: { createdAt: "desc" } });
  }

  @Post("connections")
  async connect(@Headers("cookie") cookie: string | undefined, @Body() body: { externalAccountId?: string; credentialReference?: string; externalNumberId?: string; displayNumber?: string }) {
    const organizationId = await this.organizationId(cookie);
    for (const field of ["externalAccountId", "credentialReference", "externalNumberId"] as const) if (!body[field] || body[field]!.length > 200) throw new BadRequestException(`${field} is required`);
    const account = await this.database.whatsAppAccount.upsert({ where: { externalAccountId: body.externalAccountId! }, create: { organizationId, externalAccountId: body.externalAccountId!, credentialReference: body.credentialReference! }, update: { organizationId, credentialReference: body.credentialReference!, status: "ACTIVE" } });
    const number = await this.database.whatsAppNumber.upsert({ where: { externalNumberId: body.externalNumberId! }, create: { organizationId, accountId: account.id, externalNumberId: body.externalNumberId!, ...(body.displayNumber ? { displayNumber: body.displayNumber } : {}) }, update: { organizationId, accountId: account.id, ...(body.displayNumber ? { displayNumber: body.displayNumber } : {}), status: "ACTIVE" } });
    return { accountId: account.id, numberId: number.id, status: "ACTIVE" };
  }

  private async organizationId(cookie?: string): Promise<string> {
    const token = cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith("saas_lead_session="))?.slice("saas_lead_session=".length);
    const session = await this.sessions.requireSession(token);
    const membership = await this.database.organizationMember.findUnique({ where: { organizationId_userId: { organizationId: session.organizationId, userId: session.userId } }, select: { status: true, organizationId: true } });
    if (!membership || membership.status !== "ACTIVE") throw new UnauthorizedException("Authentication required");
    return createTenantContext(session).organizationId;
  }
}
