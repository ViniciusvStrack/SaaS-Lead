import {describe,expect,it} from "vitest";
import {BillingWebhookService,InMemorySubscriptionStore,SubscriptionService} from "../src/modules/subscriptions/subscription.service.js";

describe("billing reconciliation",()=>{
  it("deduplicates webhooks and ignores an older event",()=>{
    const store=new InMemorySubscriptionStore();const service=new BillingWebhookService(store);
    service.process({provider:"stripe",externalEventId:"evt-new",externalSubscriptionId:"sub-1",organizationId:"org-a",planCode:"growth",status:"ACTIVE",createdAt:new Date("2026-10-01T12:00:00Z")});
    service.process({provider:"stripe",externalEventId:"evt-new",externalSubscriptionId:"sub-1",organizationId:"org-a",planCode:"growth",status:"ACTIVE",createdAt:new Date("2026-10-01T12:00:00Z")});
    service.process({provider:"stripe",externalEventId:"evt-old",externalSubscriptionId:"sub-1",organizationId:"org-a",planCode:"growth",status:"CANCELED",createdAt:new Date("2026-09-30T12:00:00Z")});
    expect(store.events).toHaveLength(2);expect(store.findByOrganization("org-a")?.status).toBe("ACTIVE");
  });

  it("retries subscription creation with one provider call and one local record",async()=>{
    const store=new InMemorySubscriptionStore();const provider={calls:0,async createSubscription(input:{idempotencyKey:string}){this.calls++;return{externalCustomerId:"cus-1",externalSubscriptionId:"sub-1",idempotencyKey:input.idempotencyKey};}};
    const service=new SubscriptionService(store,provider);const input={organizationId:"org-a",planCode:"growth",idempotencyKey:"create-org-a-growth"};
    const first=await service.create(input);const second=await service.create(input);
    expect(second.id).toBe(first.id);expect(provider.calls).toBe(1);expect(store.subscriptions).toHaveLength(1);
  });
});
