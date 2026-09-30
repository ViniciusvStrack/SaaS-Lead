export type PolicyReason = "OPTED_OUT" | "CONSENT_REQUIRED" | "APPROVED_TEMPLATE_REQUIRED" | "COOLDOWN_ACTIVE" | "ACCOUNT_INACTIVE" | "INSUFFICIENT_PERMISSION" | "CONTENT_CHANGED" | "CONTEXT_UNKNOWN";
export interface PolicyInput { consentStatus:"GRANTED"|"REVOKED"|"UNKNOWN"|undefined;optedOut:boolean|undefined;withinCustomerCareWindow:boolean|undefined;templateStatus:"APPROVED"|"PENDING"|"REJECTED"|undefined;cooldownSatisfied:boolean|undefined;accountActive:boolean|undefined;actorCanApprove:boolean|undefined;contentHash:string;approvedContentHash:string }
export interface PolicyDecision { decision:"APPROVED"|"BLOCKED";reasons:PolicyReason[];policyVersion:"outbound-policy.v1" }
export class PolicyEngine {
  evaluate(input:PolicyInput):PolicyDecision {
    const reasons:PolicyReason[]=[];
    if ([input.optedOut,input.withinCustomerCareWindow,input.cooldownSatisfied,input.accountActive,input.actorCanApprove].some((value)=>value===undefined)||input.consentStatus===undefined) reasons.push("CONTEXT_UNKNOWN");
    if(input.optedOut) reasons.push("OPTED_OUT");
    if(input.consentStatus!=="GRANTED") reasons.push("CONSENT_REQUIRED");
    if(input.withinCustomerCareWindow===false&&input.templateStatus!=="APPROVED") reasons.push("APPROVED_TEMPLATE_REQUIRED");
    if(input.cooldownSatisfied===false) reasons.push("COOLDOWN_ACTIVE");
    if(input.accountActive===false) reasons.push("ACCOUNT_INACTIVE");
    if(input.actorCanApprove===false) reasons.push("INSUFFICIENT_PERMISSION");
    if(input.contentHash!==input.approvedContentHash) reasons.push("CONTENT_CHANGED");
    return {decision:reasons.length===0?"APPROVED":"BLOCKED",reasons,policyVersion:"outbound-policy.v1"};
  }
}
