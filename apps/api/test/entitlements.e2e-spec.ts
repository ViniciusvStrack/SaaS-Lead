import {describe,expect,it} from "vitest";
import {EntitlementService} from "../src/modules/subscriptions/entitlement.service.js";
import {UsageRecorder} from "../src/modules/usage/usage-recorder.js";

const plan={code:"growth",entitlements:{"message.send":100}};
describe("tenant entitlements",()=>{
  it("blocks a canceled subscription",()=>{expect(new EntitlementService().can({action:"message.send",usage:0,plan,subscription:{status:"CANCELED"},now:new Date("2026-10-01T12:00:00Z")})).toEqual({allowed:false,reason:"SUBSCRIPTION_INACTIVE"});});
  it("blocks an expired trial",()=>{expect(new EntitlementService().can({action:"message.send",usage:0,plan,subscription:{status:"TRIALING",trialEndsAt:new Date("2026-10-01T11:59:59Z")},now:new Date("2026-10-01T12:00:00Z")})).toEqual({allowed:false,reason:"TRIAL_EXPIRED"});});
  it("blocks usage at the configured limit",()=>{expect(new EntitlementService().can({action:"message.send",usage:100,plan,subscription:{status:"ACTIVE"},now:new Date("2026-10-01T12:00:00Z")})).toEqual({allowed:false,reason:"LIMIT_EXCEEDED",limit:100});});
  it("allows active usage below the configured limit",()=>{expect(new EntitlementService().can({action:"message.send",usage:99,plan,subscription:{status:"ACTIVE"},now:new Date("2026-10-01T12:00:00Z")})).toEqual({allowed:true,reason:"ALLOWED",limit:100,remaining:1});});
  it("records the same usage origin only once",()=>{const recorder=new UsageRecorder();const input={organizationId:"org-a",metric:"message.send",quantity:1,sourceType:"OutboundMessage",sourceId:"out-1",occurredAt:new Date("2026-10-01T12:00:00Z")};const first=recorder.record(input);const second=recorder.record(input);expect(second.id).toBe(first.id);expect(recorder.list("org-a")).toHaveLength(1);});
});
