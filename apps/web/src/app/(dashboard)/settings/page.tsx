import Link from "next/link";
import "../../(onboarding)/onboarding/onboarding.css";
import SettingsForm from "./settings-form";

export default function SettingsPage() {
  return <main className="setup-page"><section className="setup-content" style={{ maxWidth: 900, margin: "auto", background: "white", borderRadius: 28 }}><header><Link href="/">← Visão geral</Link><h1>Configurações da empresa</h1><p>Controle o contexto que orienta análises, sugestões e regras comerciais.</p><Link href="/billing">Ver plano e uso →</Link><br /><Link href="/settings/whatsapp">Conectar WhatsApp →</Link></header><SettingsForm initial={null} /></section></main>;
}
