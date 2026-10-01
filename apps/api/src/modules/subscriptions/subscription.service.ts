import {randomUUID} from "node:crypto";
import type {BillingEventInput,BillingProvider,SubscriptionView} from "@saas-lead/contracts";

export interface StoredBillingEvent extends BillingEventInput{processedAt:Date;applied:boolean}
export class InMemorySubscriptionStore{
  readonly subscriptions:SubscriptionView[]=[];readonly events:StoredBillingEvent[]=[];
  private readonly idempotency=new Map<string,SubscriptionView>();private readonly eventIds=new Set<string>();
  findByOrganization(organizationId:string){return this.subscriptions.find((item)=>item.organizationId===organizationId);}
  findCreated(idempotencyKey:string){return this.idempotency.get(idempotencyKey);}
  saveCreated(idempotencyKey:string,subscription:SubscriptionView){this.idempotency.set(idempotencyKey,subscription);this.subscriptions.push(subscription);return subscription;}
  reconcile(event:BillingEventInput){const eventKey=`${event.provider}:${event.externalEventId}`;if(this.eventIds.has(eventKey))return this.findByOrganization(event.organizationId);this.eventIds.add(eventKey);const current=this.findByOrganization(event.organizationId);const applied=!current?.lastEventAt||event.createdAt>current.lastEventAt;this.events.push({...event,processedAt:new Date(),applied});if(!applied)return current;const next:SubscriptionView={id:current?.id??randomUUID(),organizationId:event.organizationId,planCode:event.planCode,provider:event.provider,externalCustomerId:current?.externalCustomerId??"pending",externalSubscriptionId:event.externalSubscriptionId,status:event.status,lastEventAt:event.createdAt,...(event.trialEndsAt?{trialEndsAt:event.trialEndsAt}:{}),...(event.currentPeriodEndsAt?{currentPeriodEndsAt:event.currentPeriodEndsAt}:{})};if(current)Object.assign(current,next);else this.subscriptions.push(next);return next;}
}
export class BillingWebhookService{constructor(private readonly store:InMemorySubscriptionStore){}process(event:BillingEventInput){return this.store.reconcile(event);}}
export class SubscriptionService{
  constructor(private readonly store:InMemorySubscriptionStore,private readonly provider:BillingProvider){}
  async create(input:{organizationId:string;planCode:string;idempotencyKey:string}){const existing=this.store.findCreated(input.idempotencyKey);if(existing)return existing;const external=await this.provider.createSubscription(input);return this.store.saveCreated(input.idempotencyKey,{id:randomUUID(),organizationId:input.organizationId,planCode:input.planCode,provider:"stripe",externalCustomerId:external.externalCustomerId,externalSubscriptionId:external.externalSubscriptionId,status:"INCOMPLETE"});}
}
