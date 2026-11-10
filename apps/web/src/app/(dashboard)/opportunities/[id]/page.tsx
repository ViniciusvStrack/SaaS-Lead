"use client";

import React from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { loadOpportunity, type OpportunityResult } from "../../../../lib/opportunities";
import "./detail.css";

export const dynamic = "force-dynamic";

const suggestionStatus: Record<string, string> = {
  DRAFT: "rascunho",
  APPROVED: "aprovada",
  REJECTED: "rejeitada",
};

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get("saas_lead_session")?.value;
  const result = await loadOpportunity(id, token, process.env.API_BASE_URL);
  return <OpportunityDetailView result={result} />;
}

export function OpportunityDetailView({ result }: { result: OpportunityResult }) {
  const [approveStatus, setApproveStatus] = React.useState<"idle" | "loading" | "ok" | "error">("idle");
  const [approveError, setApproveError] = React.useState<string | null>(null);

  const item = result.status === "ready" ? result.item : null;
  const suggestion = item?.suggestion;

  const handleApprove = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!item || !suggestion) return;

    setApproveStatus("loading");
    setApproveError(null);

    const body = {
      conversationId: item.conversationId,
      content: suggestion.content,
      idempotencyKey: `approve-${item.id}-${item.suggestionId ?? item.id}`,
      opportunityId: item.id,
      suggestionId: item.suggestionId,
    };

    try {
      const response = await fetch("/api/outbound/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        setApproveStatus("error");
        setApproveError(`Erro ${response.status} ao aprovar`);
        return;
      }

      setApproveStatus("ok");
    } catch {
      setApproveStatus("error");
      setApproveError("Falha ao comunicar com o servidor");
    }
  };

  return <main className="review-page">
    <nav className="review-nav"><Link href="/opportunities">← Oportunidades</Link><span>Registro comercial</span></nav>
    {result.status !== "ready" ? <section className="review-card">
      <h1>Oportunidade indisponível</h1>
      <p>{result.status === "unauthenticated" ? "O acesso por e-mail ainda está sendo conectado." : result.status === "not-found" ? "Esta oportunidade não foi encontrada na sua empresa." : "Não foi possível carregar a oportunidade agora."}</p>
    </section> : <>
      <header className="review-header"><div><p className="eyebrow">{result.item.priority === "URGENT" ? "PRIORIDADE URGENTE" : "OPORTUNIDADE"}</p><h1>{result.item.contactName}</h1><p>{result.item.type === "COMPANY_NO_RESPONSE" ? "Cliente aguardando resposta da equipe." : result.item.type === "QUOTE_ABANDONED" ? "Proposta sem retorno do cliente." : "Conversa aguardando retomada."}</p></div><b className="tag red">{result.item.status}</b></header>
      <div className="review-grid"><section className="review-card"><h2>Por que identificamos</h2><ul>{result.item.evidence.map((reason, index) => <li key={index}>{reason}</li>)}</ul><p>Regra: {result.item.ruleVersion}</p></section><aside className="review-aside"><section className="review-card"><h2>Contato</h2><strong>{result.item.contactName}</strong><p>Valor conhecido: {result.item.knownValue === null ? "Não informado" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(result.item.knownValue))}</p></section><section className="review-card"><h2>Próximo passo</h2>{suggestion ? <>
        <p><strong>{suggestion.content}</strong></p>
        <p>Sugestão gerada pela IA ({suggestionStatus[suggestion.status] ?? suggestion.status}). Revise antes de enviar.</p>
        <form onSubmit={handleApprove}>
          <button type="submit" disabled={approveStatus === "loading"} className="btn approve">
            {approveStatus === "loading" ? "Enviando…" : approveStatus === "ok" ? "Enviado ✓" : "Aprovar e enviar"}
          </button>
          {approveStatus === "error" && <p className="error">{approveError}</p>}
        </form>
      </> : <p>Ainda não há sugestão para esta oportunidade. Ela aparece depois que a conversa é analisada.</p>}
      <p>O envio pelo painel será habilitado quando a integração de aprovação estiver concluída.</p></section></aside></div>
    </>}
  </main>;
}
