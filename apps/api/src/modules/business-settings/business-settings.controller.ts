import {Body,Controller,Get,Headers,Inject,Put} from "@nestjs/common";
import type {BusinessSettingsUpdate} from "@saas-lead/contracts";
import {createTenantContext} from "@saas-lead/database";
import {BusinessSettingsService} from "./business-settings.service.js";
import {SessionService} from "../auth/session.service.js";

@Controller("business-settings")
export class BusinessSettingsController{
  constructor(@Inject(BusinessSettingsService) private readonly service:BusinessSettingsService, private readonly sessions:SessionService){}
  @Get() async get(@Headers("cookie") cookie?:string,@Headers("x-organization-id") organizationId?:string,@Headers("x-user-id") userId?:string,@Headers("x-role") role?:string){return this.service.get(await this.tenant(cookie,organizationId,userId,role));}
  @Put() async update(@Headers("cookie") cookie:string|undefined,@Headers("x-organization-id") organizationId:string|undefined,@Headers("x-user-id") userId:string|undefined,@Headers("x-role") role:string|undefined,@Body() body:BusinessSettingsUpdate){return this.service.update(await this.tenant(cookie,organizationId,userId,role),body);}
  private async tenant(cookie:string|undefined,organizationId?:string,userId?:string,role?:string){const token=cookie?.split(";").map((part)=>part.trim()).find((part)=>part.startsWith("saas_lead_session="))?.slice("saas_lead_session=".length);if(token)return createTenantContext(await this.sessions.requireSession(token));return createTenantContext({organizationId,userId,role});}
}
