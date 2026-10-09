import { Inject, Module, type OnModuleDestroy } from "@nestjs/common";
import { createDatabaseClient, type DatabaseClient } from "@saas-lead/database";
import { AuthController } from "./auth.controller.js";
import { LoginService } from "./login.service.js";
import { PrismaSessionStore } from "./prisma-session.store.js";
import { SessionService } from "./session.service.js";

@Module({
  controllers: [AuthController],
  providers: [
    { provide: "AUTH_DATABASE", useFactory: () => createDatabaseClient(process.env.DATABASE_URL ?? "") },
    { provide: PrismaSessionStore, useFactory: (database: DatabaseClient) => new PrismaSessionStore(database), inject: ["AUTH_DATABASE"] },
    { provide: SessionService, useFactory: (store: PrismaSessionStore) => new SessionService(store), inject: [PrismaSessionStore] },
    { provide: LoginService, useFactory: (database: DatabaseClient, sessions: SessionService) => new LoginService(database, sessions), inject: ["AUTH_DATABASE", SessionService] },
  ],
  exports: [SessionService],
})
export class AuthModule implements OnModuleDestroy {
  constructor(@Inject("AUTH_DATABASE") private readonly database: DatabaseClient) {}
  async onModuleDestroy(): Promise<void> { await this.database.$disconnect(); }
}
