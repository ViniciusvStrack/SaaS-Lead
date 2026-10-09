import { Inject, Module, type OnModuleDestroy } from "@nestjs/common";
import { createDatabaseClient, type DatabaseClient } from "@saas-lead/database";
import { AuthModule } from "../auth/auth.module.js";
import { OpportunitiesController } from "./opportunities.controller.js";
import { PrismaOpportunityRead } from "./prisma-opportunity.read.js";

@Module({
  imports: [AuthModule],
  controllers: [OpportunitiesController],
  providers: [
    { provide: "OPPORTUNITIES_DATABASE", useFactory: () => createDatabaseClient(process.env.DATABASE_URL ?? "") },
    { provide: PrismaOpportunityRead, useFactory: (database: ReturnType<typeof createDatabaseClient>) => new PrismaOpportunityRead(database), inject: ["OPPORTUNITIES_DATABASE"] },
  ],
  exports: [AuthModule],
})
export class OpportunitiesModule implements OnModuleDestroy {
  constructor(@Inject("OPPORTUNITIES_DATABASE") private readonly database: DatabaseClient) {}
  async onModuleDestroy(): Promise<void> { await this.database.$disconnect(); }
}
