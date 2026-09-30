import "reflect-metadata";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { BusinessSettingsModule } from "../src/modules/business-settings/business-settings.module.js";

const owner={"x-organization-id":"org-a","x-user-id":"owner-a","x-role":"OWNER"};
const agent={"x-organization-id":"org-a","x-user-id":"agent-a","x-role":"AGENT"};

describe("business settings",()=>{
  let close:(()=>Promise<void>)|undefined;
  afterEach(async()=>close?.());
  async function app(){const module=await Test.createTestingModule({imports:[BusinessSettingsModule]}).compile();const instance=module.createNestApplication();await instance.init();close=()=>instance.close();return instance;}

  it("returns safe horizontal defaults when settings are empty",async()=>{
    const instance=await app();const response=await request(instance.getHttpServer()).get("/business-settings").set(owner).expect(200);
    expect(response.body).toEqual({organizationId:"org-a",version:0,timezone:"America/Sao_Paulo",businessHours:[],allowDiscounts:false,allowedClaims:[],commercialPolicies:[],goals:[]});
  });

  it("versions business hours, timezone and an explicit false discount policy",async()=>{
    const instance=await app();const response=await request(instance.getHttpServer()).put("/business-settings").set(owner).send({description:"Atendimento comercial para empresas",tone:"consultivo",timezone:"America/Recife",businessHours:[{day:"MONDAY",opensAt:"09:00",closesAt:"18:00"}],allowDiscounts:false,discountPolicy:"Até 10%"}).expect(200);
    expect(response.body).toMatchObject({version:1,timezone:"America/Recife",allowDiscounts:false,businessHours:[{day:"MONDAY",opensAt:"09:00",closesAt:"18:00"}]});
    expect(response.body).not.toHaveProperty("discountPolicy");
  });

  it("allows admins but rejects agents when editing settings",async()=>{
    const instance=await app();await request(instance.getHttpServer()).put("/business-settings").set({...owner,"x-role":"ADMIN"}).send({tone:"direto"}).expect(200);
    await request(instance.getHttpServer()).put("/business-settings").set(agent).send({tone:"informal"}).expect(403);
  });
});
