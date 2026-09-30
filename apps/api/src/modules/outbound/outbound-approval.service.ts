import { createHash, randomUUID } from "node:crypto";
import type { TenantContext } from "@saas-lead/database";
import type { PolicyDecision, PolicyEngine, PolicyInput } from "@saas-lead/policy";
type ApprovalContext=Omit<PolicyInput,"actorCanApprove"|"contentHash"|"approvedContentHash">;
export interface ApproveOutboundInput { opportunityId?:string;conversationId:string;content:string;idempotencyKey:string;context:ApprovalContext }
export interface OutboundRecord { id:string;organizationId:string;conversationId:string;opportunityId?:string;content:string;contentHash:string;idempotencyKey:string;status:"APPROVED"|"BLOCKED";policyDecision:PolicyDecision }
export interface SendJob { queue:"message.send";outboundMessageId:string;organizationId:string }
export class InMemoryOutboundStore {
  private readonly records=new Map<string,OutboundRecord>(); readonly queuedJobs:SendJob[]=[];
  find(organizationId:string,idempotencyKey:string){return this.records.get(`${organizationId}:${idempotencyKey}`);}
  save(record:OutboundRecord){this.records.set(`${record.organizationId}:${record.idempotencyKey}`,record);return record;}
  enqueue(job:SendJob){this.queuedJobs.push(job);}
}
export class OutboundApprovalService {
  constructor(private readonly store:InMemoryOutboundStore,private readonly policy:PolicyEngine){}
  async approve(tenant:TenantContext,input:ApproveOutboundInput):Promise<OutboundRecord>{
    const existing=this.store.find(tenant.organizationId,input.idempotencyKey);if(existing)return existing;
    const contentHash=createHash("sha256").update(input.content).digest("hex");
    const policyDecision=this.policy.evaluate({...input.context,actorCanApprove:["OWNER","ADMIN","AGENT"].includes(tenant.role),contentHash,approvedContentHash:contentHash});
    const record=this.store.save({id:randomUUID(),organizationId:tenant.organizationId,conversationId:input.conversationId,...(input.opportunityId?{opportunityId:input.opportunityId}:{}),content:input.content,contentHash,idempotencyKey:input.idempotencyKey,status:policyDecision.decision,policyDecision});
    if(record.status==="APPROVED")this.store.enqueue({queue:"message.send",outboundMessageId:record.id,organizationId:tenant.organizationId});return record;
  }
}
