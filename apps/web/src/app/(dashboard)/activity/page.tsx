import Link from "next/link";
import "./activity.css";

const events = [
  ["Conversão confirmada", "Oportunidade #1042 · evidência CRM", "Hoje, 13:42", "positive"],
  ["Exportação de dados", "Solicitação atendida por Administrador", "Ontem, 16:18", "neutral"],
  ["Retenção aplicada", "1 registro preservado por obrigação legal", "29 set, 10:04", "warning"],
];

export default function ActivityPage() {
  return <main className="activity-page">
    <nav><Link href="/">← Visão geral</Link><span>Dados demonstrativos</span></nav>
    <header><p className="activity-eyebrow">CONTROLE E CONFIANÇA</p><h1>Resultados e atividade</h1><p>Indicadores comerciais com evidência e um histórico operacional pronto para auditoria.</p></header>
    <section className="activity-metrics" aria-label="Resultados comerciais">
      <article><span>Receita atribuída</span><strong>R$ 4.900</strong><small>1 conversão confirmada</small></article>
      <article><span>Valor sem atribuição</span><strong>R$ 3.000</strong><small>Não contabilizado como receita</small></article>
      <article><span>Taxa de entrega</span><strong>96,8%</strong><small>Últimos 30 dias</small></article>
    </section>
    <section className="activity-grid">
      <article className="activity-panel"><div className="activity-title"><span><b>Atividade recente</b><small>Eventos sem conteúdo sensível</small></span><button>Exportar relatório</button></div>{events.map(([title, detail, time, tone]) => <div className="activity-event" key={title}><i className={tone}/><span><b>{title}</b><small>{detail}</small></span><time>{time}</time></div>)}</article>
      <aside className="privacy-panel"><span>PRIVACIDADE</span><h2>Direitos do titular</h2><p>Exporte ou solicite a exclusão com protocolo, trilha de auditoria e análise de retenção legal.</p><button>Exportar dados</button><button className="secondary">Solicitar exclusão</button><small>Prazo e identidade devem ser validados antes do processamento.</small></aside>
    </section>
  </main>;
}
