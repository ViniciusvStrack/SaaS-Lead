import {randomUUID} from "node:crypto";
import type {UsageInput} from "@saas-lead/contracts";
export interface UsageRecordView extends UsageInput{id:string}
export class UsageRecorder{
  private readonly records=new Map<string,UsageRecordView>();
  record(input:UsageInput){const key=`${input.organizationId}:${input.metric}:${input.sourceType}:${input.sourceId}`;const existing=this.records.get(key);if(existing)return existing;const record={id:randomUUID(),...input};this.records.set(key,record);return record;}
  list(organizationId:string){return [...this.records.values()].filter((item)=>item.organizationId===organizationId);}
}
