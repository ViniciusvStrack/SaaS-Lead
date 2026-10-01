import Link from "next/link";
import { cookies } from "next/headers";
import { loadOpportunities, type OpportunitiesResult, type OpportunityItem } from "../../../lib/opportunities";

export const dynamic = "force-dynamic";

const labels: Record<string, string> = {
  QUOTE_ABANDONED: "Proposta sem retorno",
  LEAD_GHOSTED: "Lead sem retorno",
  COMPANY_NO_RESPONSE: "Aguardando resposta da equipe",
};
const priorities: Record<string, { label: string; color: string }> = {
  URGENT: { label: "Urgente", color: "red" },
  HIGH: { label: "Alta", color: "orange" },
  MEDIUM: { label: "Média", color: "purple" },
};

export default async function OpportunitiesPage() {
  const token = (await cookies()).get("saas_lead_session")?.value;
  const result = await loadOpportunities(token, process.env.API_BASE_URL);
  return <OpportunitiesView result={result} />;
}

export function OpportunitiesView({ result }: { result: OpportunitiesResult }) {
  return <main className="simple-page">
    <Link className="back" href="/">← Visão geral</Link>
    <p className="eyebrow">PIPELINE COMERCIAL</p>
    <h1>Oportunidades</h1>
    <p className="subtitle">Sinais comerciais priorizados com regras determinísticas e evidências da conversa.</p>
    {result.status === "unauthenticated" && <p className="demo-notice compact">O acesso por e-mail ainda está sendo conectado. As oportunidades reais aparecerão aqui após a ativação do login.</p>}
    {result.status === "unavailable" && <p className="demo-notice compact">Não foi possível carregar as oportunidades agora. Tente novamente em instantes.</p>}
    {result.status === "ready" && result.items.length === 0 && <p className="demo-notice compact">Nenhuma oportunidade identificada ainda.</p>}
    {result.status === "ready" && result.items.length > 0 && <section className="opportunities-table">
      <header><span>Contato e oportunidade</span><span>Motivo identificado</span><span>Valor conhecido</span><span>Prioridade</span></header>
      {result.items.map((item) => <Row key={item.id} item={item} />)}
    </section>}
  </main>;
}

function Row({ item }: { item: OpportunityItem }) {
  const priority = priorities[item.priority] ?? priorities.MEDIUM!;
  const value = item.knownValue === null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(item.knownValue));
  return <article>
    <span><Link href={`/opportunities/${item.id}`}><strong>{item.contactName}</strong></Link><small>{labels[item.type] ?? "Oportunidade"}</small></span>
    <span>{item.evidence[0] ?? "Evidência indisponível"}</span>
    <b>{value}</b>
    <i className={`tag ${priority.color}`}>{priority.label}</i>
  </article>;
}
