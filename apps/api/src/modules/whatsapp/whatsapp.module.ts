import { Inject, Module, type OnModuleDestroy } from "@nestjs/common";
import { createDatabaseClient, type DatabaseClient } from "@saas-lead/database";
import { AuthModule } from "../auth/auth.module.js";
import { WhatsAppController } from "./whatsapp.controller.js";

@Module({ imports: [AuthModule], controllers: [WhatsAppController], providers: [{ provide: "WHATSAPP_DATABASE", useFactory: () => createDatabaseClient(process.env.DATABASE_URL ?? "") }] })
export class WhatsAppModule implements OnModuleDestroy {
  constructor(@Inject("WHATSAPP_DATABASE") private readonly database: DatabaseClient) {}
  async onModuleDestroy(): Promise<void> { await this.database.$disconnect(); }
}
