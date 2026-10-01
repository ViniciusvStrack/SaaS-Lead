import Link from "next/link";
import { cookies } from "next/headers";
import { loadOpportunity, type OpportunityResult } from "../../../../lib/opportunities";
import "./detail.css";

export const dynamic = "force-dynamic";

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get("saas_lead_session")?.value;
  const result = await loadOpportunity(id, token, process.env.API_BASE_URL);
  return <OpportunityDetailView result={result} />;
}

export function OpportunityDetailView({ result }: { result: OpportunityResult }) {
  return <main className="review-page">
    <nav className="review-nav"><Link href="/opportunities">← Oportunidades</Link><span>Registro comercial</span></nav>
    {result.status !== "ready" ? <section className="review-card">
      <h1>Oportunidade indisponível</h1>
      <p>{result.status === "unauthenticated" ? "O acesso por e-mail ainda está sendo conectado." : result.status === "not-found" ? "Esta oportunidade não foi encontrada na sua empresa." : "Não foi possível carregar a oportunidade agora."}</p>
    </section> : <>
      <header className="review-header"><div><p className="eyebrow">{result.item.priority === "URGENT" ? "PRIORIDADE URGENTE" : "OPORTUNIDADE"}</p><h1>{result.item.contactName}</h1><p>{result.item.type === "COMPANY_NO_RESPONSE" ? "Cliente aguardando resposta da equipe." : result.item.type === "QUOTE_ABANDONED" ? "Proposta sem retorno do cliente." : "Conversa aguardando retomada."}</p></div><b className="tag red">{result.item.status}</b></header>
      <div className="review-grid"><section className="review-card"><h2>Por que identificamos</h2><ul>{result.item.evidence.map((reason, index) => <li key={index}>{reason}</li>)}</ul><p>Regra: {result.item.ruleVersion}</p></section><aside className="review-aside"><section className="review-card"><h2>Contato</h2><strong>{result.item.contactName}</strong><p>Valor conhecido: {result.item.knownValue === null ? "Não informado" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(result.item.knownValue))}</p></section><section className="review-card"><h2>Próximo passo</h2><p>Revise a conversa e responda pelo canal autorizado. O envio pelo painel será habilitado quando a integração de aprovação estiver concluída.</p></section></aside></div>
    </>}
  </main>;
}
