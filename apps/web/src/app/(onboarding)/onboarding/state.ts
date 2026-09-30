export type OnboardingStep="BUSINESS_PROFILE"|"WHATSAPP_CONNECTION"|"COMPLETE";
export function nextOnboardingStep(input:{version:number;whatsappConnected:boolean}):OnboardingStep{if(input.version===0)return "BUSINESS_PROFILE";return input.whatsappConnected?"COMPLETE":"WHATSAPP_CONNECTION";}
