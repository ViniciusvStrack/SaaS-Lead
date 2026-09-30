import type { PolicyEngine, PolicyInput } from "@saas-lead/policy";
export type OutboundStatus="APPROVED"|"BLOCKED"|"SENT"|"DELIVERED"|"READ"|"FAILED";
export interface SendRecord { id:string;organizationId:string;phoneNumberId:string;to:string;content:string;contentHash:string;approvedContentHash:string;idempotencyKey:string;status:OutboundStatus;externalMessageId?:string;context:Omit<PolicyInput,"contentHash"|"approvedContentHash"> }
export interface StatusEvent {externalEventId:string;outboundMessageId:string;status:OutboundStatus}
export interface SendProvider {send(input:{phoneNumberId:string;to:string;payload:Record<string,unknown>;idempotencyKey:string}):Promise<{messageId:string}>}
export class InMemorySendStore {
  private readonly records=new Map<string,SendRecord>();readonly events:StatusEvent[]=[];private readonly externalEvents=new Set<string>();
  constructor(records:SendRecord[]=[]){for(const record of records)this.records.set(record.id,{...record});}
  get(id:string){return this.records.get(id);}
  findExternal(organizationId:string,externalMessageId:string){return [...this.records.values()].find((item)=>item.organizationId===organizationId&&item.externalMessageId===externalMessageId);}
  setStatus(id:string,status:OutboundStatus,externalMessageId?:string){const record=this.records.get(id);if(record)this.records.set(id,{...record,status,...(externalMessageId?{externalMessageId}:{})});}
  reconcile(externalEventId:string,record:SendRecord,status:OutboundStatus){if(this.externalEvents.has(externalEventId))return;this.externalEvents.add(externalEventId);this.setStatus(record.id,status);this.events.push({externalEventId,outboundMessageId:record.id,status});}
}
export class SendMessageProcessor {
  constructor(private readonly store:InMemorySendStore,private readonly provider:SendProvider,private readonly policy:PolicyEngine){}
  async process(job:{organizationId:string;outboundMessageId:string}){const record=this.store.get(job.outboundMessageId);if(!record||record.organizationId!==job.organizationId||record.status!=="APPROVED")return;const decision=this.policy.evaluate({...record.context,contentHash:record.contentHash,approvedContentHash:record.approvedContentHash});if(decision.decision!=="APPROVED"){this.store.setStatus(record.id,"BLOCKED");return;}try{const result=await this.provider.send({phoneNumberId:record.phoneNumberId,to:record.to,payload:{type:"text",text:{body:record.content}},idempotencyKey:record.idempotencyKey});this.store.setStatus(record.id,"SENT",result.messageId);}catch(error){this.store.setStatus(record.id,"APPROVED");throw error;}}
}
