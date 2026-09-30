import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import OnboardingPage from "./page.js";
import { nextOnboardingStep } from "./state.js";
import SettingsPage from "../../(dashboard)/settings/page.js";

describe("horizontal onboarding",()=>{
  it("starts with the business profile when settings are empty",()=>{expect(nextOnboardingStep({version:0,whatsappConnected:false})).toBe("BUSINESS_PROFILE");});
  it("resumes at connection after universal settings were saved",()=>{expect(nextOnboardingStep({version:2,whatsappConnected:false})).toBe("WHATSAPP_CONNECTION");});
  it("finishes only after settings and WhatsApp are ready",()=>{expect(nextOnboardingStep({version:1,whatsappConnected:true})).toBe("COMPLETE");});
  it("renders universal profile, hours and policy fields",()=>{const html=renderToStaticMarkup(<OnboardingPage/>);expect(html).toContain("Configure sua operação");expect(html).toContain("Horário de atendimento");expect(html).toContain("Permitir descontos");expect(html).toContain("Fuso horário");});
  it("renders a settings screen that does not depend on an industry",()=>{const html=renderToStaticMarkup(<SettingsPage/>);expect(html).toContain("Configurações da empresa");expect(html).toContain("Tom de comunicação");expect(html).not.toContain("oficina");});
});
