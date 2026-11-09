import { Inject, Module, type OnModuleDestroy } from "@nestjs/common";
import { createDatabaseClient, type DatabaseClient } from "@saas-lead/database";

import { AuditService } from "./audit.service.js";
import { PrismaAuditStore } from "./prisma-audit.store.js";

@Module({
  providers: [
    { provide: "AUDIT_DATABASE", useFactory: () => createDatabaseClient(process.env.DATABASE_URL ?? "") },
    { provide: PrismaAuditStore, useFactory: (database: DatabaseClient) => new PrismaAuditStore(database), inject: ["AUDIT_DATABASE"] },
    {
      provide: "AUDIT_SERVICE",
      useFactory: (store: PrismaAuditStore) => new AuditService(store),
      inject: [PrismaAuditStore],
    },
  ],
  exports: ["AUDIT_SERVICE"],
})
export class AuditModule implements OnModuleDestroy {
  constructor(@Inject("AUDIT_DATABASE") private readonly database: DatabaseClient) {}
  async onModuleDestroy(): Promise<void> { await this.database.$disconnect(); }
}
