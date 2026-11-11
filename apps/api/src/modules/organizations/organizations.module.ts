import { Inject, Module, type OnModuleDestroy } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { createDatabaseClient, type DatabaseClient } from "@saas-lead/database";
import type { AuditService } from "../audit/audit.service.js";
import { PrismaOrganizationRepository } from "./prisma-organization.repository.js";
import type { OrganizationRepository } from "./organization.repository.js";
import { OrganizationsController } from "./organizations.controller.js";
import { OrganizationsService } from "./organizations.service.js";

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [OrganizationsController],
  providers: [
    { provide: "ORGANIZATIONS_DATABASE", useFactory: () => createDatabaseClient(process.env.DATABASE_URL ?? "") },
    { provide: PrismaOrganizationRepository, useFactory: (database: DatabaseClient) => new PrismaOrganizationRepository(database), inject: ["ORGANIZATIONS_DATABASE"] },
    { provide: "ORGANIZATION_REPOSITORY", useExisting: PrismaOrganizationRepository },
    {
      provide: "ORGANIZATIONS_SERVICE",
      useFactory: (repository: OrganizationRepository, audit: AuditService) =>
        new OrganizationsService(repository, audit),
      inject: ["ORGANIZATION_REPOSITORY", "AUDIT_SERVICE"],
    },
  ],
  exports: ["ORGANIZATIONS_SERVICE", "ORGANIZATION_REPOSITORY"],
})
export class OrganizationsModule implements OnModuleDestroy {
  constructor(@Inject("ORGANIZATIONS_DATABASE") private readonly database: DatabaseClient) {}
  async onModuleDestroy(): Promise<void> { await this.database.$disconnect(); }
}
