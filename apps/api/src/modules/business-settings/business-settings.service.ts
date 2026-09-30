import {ForbiddenException,Injectable} from "@nestjs/common";
import type {BusinessSettings,BusinessSettingsUpdate} from "@saas-lead/contracts";
import type {TenantContext} from "@saas-lead/database";

const defaults=(organizationId:string):BusinessSettings=>({organizationId,version:0,timezone:"America/Sao_Paulo",businessHours:[],allowDiscounts:false,allowedClaims:[],commercialPolicies:[],goals:[]});

@Injectable()
export class BusinessSettingsService{
  private readonly settings=new Map<string,BusinessSettings>();
  get(tenant:TenantContext):BusinessSettings{return this.settings.get(tenant.organizationId)??defaults(tenant.organizationId);}
  update(tenant:TenantContext,update:BusinessSettingsUpdate):BusinessSettings{
    if(tenant.role==="AGENT")throw new ForbiddenException("Insufficient role");
    const current=this.get(tenant);
    const next:BusinessSettings={...current,...update,organizationId:tenant.organizationId,version:current.version+1,businessHours:update.businessHours??current.businessHours,allowedClaims:update.allowedClaims??current.allowedClaims,commercialPolicies:update.commercialPolicies??current.commercialPolicies,goals:update.goals??current.goals};
    if(next.allowDiscounts===false)delete next.discountPolicy;
    this.settings.set(tenant.organizationId,next);return next;
  }
}
