import Link from "next/link";
import "../../../../(onboarding)/onboarding/onboarding.css";
import WhatsAppConnectionForm from "./whatsapp-connection-form";

export default function WhatsAppSettingsPage() {
  return <main className="setup-page"><section className="setup-content" style={{ maxWidth: 900, margin: "auto", background: "white", borderRadius: 28 }}><header><Link href="/settings">← Configurações</Link><h1>Conectar WhatsApp</h1><p>Cadastre a conta e o número usados pela operação para receber conversas e enviar respostas aprovadas.</p></header><WhatsAppConnectionForm /></section></main>;
}
