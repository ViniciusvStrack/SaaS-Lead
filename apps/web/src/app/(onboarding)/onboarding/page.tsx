import OnboardingForm from "./onboarding-form";
import "./onboarding.css";

export default function OnboardingPage() {
  return <main className="setup-page"><div className="setup-shell"><aside className="setup-steps"><div className="setup-brand">S</div><p>CONFIGURAÇÃO</p><ol><li className="current"><b>1</b>Empresa</li><li><b>2</b>Atendimento</li><li><b>3</b>Políticas</li><li><b>4</b>WhatsApp</li></ol><small>Você pode sair e continuar depois.</small></aside><section className="setup-content"><header><span>Etapa 1 de 4</span><h1>Configure sua operação</h1><p>Informações universais para personalizar análises e sugestões, independentemente do seu segmento.</p></header><OnboardingForm /></section></div></main>;
}
