import { Controller, Get, Headers, Inject, NotFoundException, Param, ParseUUIDPipe, UnauthorizedException } from "@nestjs/common";
import type { DatabaseClient } from "@saas-lead/database";
import { SessionService } from "../auth/session.service.js";
import { PrismaOpportunityRead } from "./prisma-opportunity.read.js";

@Controller("opportunities")
export class OpportunitiesController {
  constructor(
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(PrismaOpportunityRead) private readonly opportunities: PrismaOpportunityRead,
    @Inject("OPPORTUNITIES_DATABASE") private readonly database: DatabaseClient,
  ) {}

  private async organizationId(cookie: string | undefined): Promise<string> {
    const token = cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith("saas_lead_session="))?.slice("saas_lead_session=".length);
    const session = await this.sessions.requireSession(token);
    const membership = await this.database.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: session.organizationId, userId: session.userId } },
      include: { organization: true, user: true },
    });
    if (!membership || membership.status !== "ACTIVE" || membership.organization.status !== "ACTIVE" || membership.user.status !== "ACTIVE") throw new UnauthorizedException("Authentication required");
    return membership.organizationId;
  }

  @Get()
  async list(@Headers("cookie") cookie?: string) {
    return this.opportunities.list(await this.organizationId(cookie));
  }

  @Get(":id")
  async find(@Param("id", new ParseUUIDPipe()) id: string, @Headers("cookie") cookie?: string) {
    const opportunity = await this.opportunities.find(await this.organizationId(cookie), id);
    if (!opportunity) throw new NotFoundException("Opportunity not found");
    return opportunity;
  }
}
