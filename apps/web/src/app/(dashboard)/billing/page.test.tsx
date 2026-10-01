import {renderToStaticMarkup} from "react-dom/server";
import {describe,expect,it} from "vitest";
import BillingPage from "./page.js";
describe("billing dashboard",()=>{it("shows plan, usage and provider validation without hardcoded prices",()=>{const html=renderToStaticMarkup(<BillingPage/>);expect(html).toContain("Plano e uso");expect(html).toContain("Mensagens enviadas");expect(html).toContain("Configuração demonstrativa");expect(html).toContain("custos da Meta são medidos separadamente");expect(html).not.toMatch(/R\$\s*\d/);});});
