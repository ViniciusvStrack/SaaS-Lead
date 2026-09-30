export const businessDays=["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"] as const;
export type BusinessDay=(typeof businessDays)[number];
export interface BusinessHoursPeriod{day:BusinessDay;opensAt:string;closesAt:string}
export interface BusinessSettings{
  organizationId:string;version:number;industry?:string;description?:string;tone?:string;timezone:string;
  businessHours:BusinessHoursPeriod[];allowDiscounts:boolean;discountPolicy?:string;
  allowedClaims:string[];commercialPolicies:string[];goals:string[];
}
export type BusinessSettingsUpdate=Partial<Omit<BusinessSettings,"organizationId"|"version">>;
