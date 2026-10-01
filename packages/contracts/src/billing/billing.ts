export type SubscriptionStatus="TRIALING"|"ACTIVE"|"PAST_DUE"|"CANCELED"|"INCOMPLETE";
export interface PlanContract{code:string;entitlements:Record<string,number|boolean>;pricingConfig?:Record<string,unknown>}
export interface SubscriptionView{id:string;organizationId:string;planCode:string;provider:string;externalCustomerId:string;externalSubscriptionId:string;status:SubscriptionStatus;trialEndsAt?:Date;currentPeriodEndsAt?:Date;lastEventAt?:Date}
export interface BillingProvider{createSubscription(input:{organizationId:string;planCode:string;idempotencyKey:string}):Promise<{externalCustomerId:string;externalSubscriptionId:string;idempotencyKey:string}>}
export interface BillingEventInput{provider:string;externalEventId:string;externalSubscriptionId:string;organizationId:string;planCode:string;status:SubscriptionStatus;createdAt:Date;trialEndsAt?:Date;currentPeriodEndsAt?:Date}
export interface UsageInput{organizationId:string;metric:string;quantity:number;sourceType:string;sourceId:string;occurredAt:Date;unitCost?:number}
