import {Body,Controller,Get,Headers,Inject,Put} from "@nestjs/common";
import type {BusinessSettingsUpdate} from "@saas-lead/contracts";
import {createTenantContext} from "@saas-lead/database";
import {BusinessSettingsService} from "./business-settings.service.js";

@Controller("business-settings")
export class BusinessSettingsController{
  constructor(@Inject(BusinessSettingsService) private readonly service:BusinessSettingsService){}
  @Get() get(@Headers("x-organization-id") organizationId?:string,@Headers("x-user-id") userId?:string,@Headers("x-role") role?:string){return this.service.get(createTenantContext({organizationId,userId,role}));}
  @Put() update(@Headers("x-organization-id") organizationId:string|undefined,@Headers("x-user-id") userId:string|undefined,@Headers("x-role") role:string|undefined,@Body() body:BusinessSettingsUpdate){return this.service.update(createTenantContext({organizationId,userId,role}),body);}
}
