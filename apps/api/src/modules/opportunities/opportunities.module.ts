import { Inject, Module, type OnModuleDestroy } from "@nestjs/common";
import { createDatabaseClient, type DatabaseClient } from "@saas-lead/database";
import { PrismaSessionStore } from "../auth/prisma-session.store.js";
import { SessionService } from "../auth/session.service.js";
import { OpportunitiesController } from "./opportunities.controller.js";
import { PrismaOpportunityRead } from "./prisma-opportunity.read.js";

@Module({
  controllers: [OpportunitiesController],
  providers: [
    { provide: "OPPORTUNITIES_DATABASE", useFactory: () => createDatabaseClient(process.env.DATABASE_URL ?? "") },
    { provide: PrismaSessionStore, useFactory: (database: ReturnType<typeof createDatabaseClient>) => new PrismaSessionStore(database), inject: ["OPPORTUNITIES_DATABASE"] },
    { provide: SessionService, useFactory: (store: PrismaSessionStore) => new SessionService(store), inject: [PrismaSessionStore] },
    { provide: PrismaOpportunityRead, useFactory: (database: ReturnType<typeof createDatabaseClient>) => new PrismaOpportunityRead(database), inject: ["OPPORTUNITIES_DATABASE"] },
  ],
  exports: [SessionService],
})
export class OpportunitiesModule implements OnModuleDestroy {
  constructor(@Inject("OPPORTUNITIES_DATABASE") private readonly database: DatabaseClient) {}
  async onModuleDestroy(): Promise<void> { await this.database.$disconnect(); }
}
