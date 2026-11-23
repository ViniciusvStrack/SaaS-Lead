import { Inject, Module, type OnModuleDestroy } from "@nestjs/common";
import { createDatabaseClient, type DatabaseClient } from "@saas-lead/database";
import { AuthModule } from "../auth/auth.module.js";
import { MercadoPagoProvider, parseMercadoPagoPlanIds } from "./mercadopago.provider.js";
import { PrismaSubscriptionStore } from "./prisma-subscription.store.js";
import { SubscriptionsController } from "./subscriptions.controller.js";
import { SubscriptionEntitlementService } from "./subscription-entitlement.service.js";

@Module({
  imports: [AuthModule],
  controllers: [SubscriptionsController],
  providers: [
    { provide: "SUBSCRIPTIONS_DATABASE", useFactory: () => createDatabaseClient(process.env.DATABASE_URL ?? "") },
    { provide: PrismaSubscriptionStore, useFactory: (database: DatabaseClient) => new PrismaSubscriptionStore(database), inject: ["SUBSCRIPTIONS_DATABASE"] },
    { provide: "SUBSCRIPTION_STORE", useExisting: PrismaSubscriptionStore },
    { provide: SubscriptionEntitlementService, useFactory: (database: DatabaseClient) => new SubscriptionEntitlementService(database), inject: ["SUBSCRIPTIONS_DATABASE"] },
    { provide: "MERCADOPAGO_WEBHOOK_SECRET", useFactory: () => process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "" },
    { provide: "MERCADOPAGO_PROVIDER", useFactory: () => new MercadoPagoProvider({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN ?? "", apiUrl: process.env.MERCADOPAGO_API_URL ?? "https://api.mercadopago.com", backUrl: process.env.MERCADOPAGO_BACK_URL ?? "", planIds: parseMercadoPagoPlanIds(process.env.MERCADOPAGO_PLAN_IDS_JSON ?? "{}") }) },
  ],
})
export class SubscriptionsModule implements OnModuleDestroy {
  constructor(@Inject("SUBSCRIPTIONS_DATABASE") private readonly database: DatabaseClient) {}
  async onModuleDestroy(): Promise<void> { await this.database.$disconnect(); }
}
