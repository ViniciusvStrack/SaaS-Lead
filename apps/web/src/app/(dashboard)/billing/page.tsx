import Link from "next/link";
import { cookies } from "next/headers";
import "./billing.css";
import { loadCurrentSubscription, loadUsage, type BillingResult, type UsageSummary } from "../../../lib/billing";
import { CheckoutForm } from "./checkout-form";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const token = (await cookies()).get("saas_lead_session")?.value;
  const result = await loadCurrentSubscription(token, process.env.API_BASE_URL);
  const usage = await loadUsage();
  return <BillingView result={result} usage={usage} />;
}

export function BillingView({ result, usage = null }: { result: BillingResult; usage?: UsageSummary | null }) {
  const subscription = result.status === "ready" ? result.subscription : null;
  return <main className="billing-page">
    <nav><Link href="/settings">← Configurações</Link><span>Mercado Pago</span></nav>
    <header><p className="eyebrow">BILLING</p><h1>Plano e uso</h1><p>Acompanhe sua assinatura e os limites operacionais da empresa.</p></header>
    {result.status === "unauthenticated" && <p className="demo-notice compact">Faça login para consultar sua assinatura.</p>}
    {result.status === "unavailable" && <p className="demo-notice compact">Não foi possível carregar a assinatura agora. Tente novamente em instantes.</p>}
    {result.status === "ready" && <section className="billing-grid">
      <article className="plan-card"><div><span>PLANO ATUAL</span><h2>{subscription?.planName ?? "Sem assinatura"}</h2><p>{subscription ? "Assinatura gerenciada pelo Mercado Pago." : "Escolha um plano para ativar sua operação."}</p></div><b>{subscription?.status ?? "INACTIVE"}</b></article>
      <article className="usage-card"><b>Assinatura</b><p>{subscription ? `Código do plano: ${subscription.planCode}` : "Nenhuma assinatura ativa encontrada."}</p></article>
      <article className="usage-card"><b>Próximo passo</b><p>{subscription?.status === "ACTIVE" ? "Sua assinatura está ativa." : "Conecte um plano pelo checkout do Mercado Pago."}</p></article>
    </section>}
    {result.status === "ready" && usage && <section className="usage-card"><b>Uso no ciclo atual</b><p>{Object.entries(usage.limits).map(([metric, limit]) => `${metric}: ${usage.usage[metric] ?? 0}/${limit}`).join(" · ") || "Nenhum limite configurado."}</p></section>}
    {result.status === "ready" && !subscription && <CheckoutForm />}
    <aside className="billing-note"><b>Transparência de custos</b><p>Valores, limites e status são controlados pelo sistema e confirmados pelo Mercado Pago via webhook.</p></aside>
  </main>;
}
