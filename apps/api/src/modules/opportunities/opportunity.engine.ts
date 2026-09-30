import { createHash } from "node:crypto";
import type { OpportunityCandidate, OpportunityType } from "@saas-lead/contracts";

export interface OpportunityDetectionInput { organizationId:string;conversationId:string;analysis:{intent:string;stage:string;urgency:number};now:Date;quoteSentAt?:Date;lastInboundAt?:Date;lastOutboundAt?:Date;quotedAmount?:number }

export class OpportunityEngine {
  detect(input: OpportunityDetectionInput): OpportunityCandidate[] {
    let type: OpportunityType | undefined;
    let priority: OpportunityCandidate["priority"] = "MEDIUM";
    let evidence: string[] = [];
    if (input.quoteSentAt && hours(input.now,input.quoteSentAt)>=48 && (!input.lastInboundAt || input.lastInboundAt<input.quoteSentAt)) { type="QUOTE_ABANDONED";priority="HIGH";evidence=["proposta enviada há mais de 48 horas sem retorno do cliente"]; }
    else if (input.lastOutboundAt && input.lastInboundAt && input.lastInboundAt<input.lastOutboundAt && hours(input.now,input.lastOutboundAt)>=72) { type="LEAD_GHOSTED";priority="HIGH";evidence=["resposta enviada pela empresa há mais de 72 horas sem retorno"]; }
    else if (input.lastInboundAt && (!input.lastOutboundAt || input.lastOutboundAt<input.lastInboundAt) && hours(input.now,input.lastInboundAt)>=4) { type="COMPANY_NO_RESPONSE";priority="URGENT";evidence=["mensagem do lead sem resposta da empresa há mais de 4 horas"]; }
    if (!type) return [];
    const deduplicationKey=createHash("sha256").update(`${input.organizationId}:${input.conversationId}:${type}`).digest("hex");
    return [{deduplicationKey,organizationId:input.organizationId,conversationId:input.conversationId,type,priority,knownValue:input.quotedAmount??null,evidence,ruleVersion:"opportunity-rules.v1"}];
  }
}
const hours=(later:Date,earlier:Date)=>(later.getTime()-earlier.getTime())/3_600_000;
