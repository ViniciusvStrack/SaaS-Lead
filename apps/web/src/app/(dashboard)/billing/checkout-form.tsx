"use client";

import { useState } from "react";

const plans = [
  { code: "essential", name: "Essencial", description: "Para começar a organizar os leads." },
  { code: "professional", name: "Profissional", description: "Para equipes comerciais em operação." },
  { code: "performance", name: "Performance", description: "Para operações com maior volume." },
  { code: "jarvis", name: "Jarvis", description: "Para automações e voz executiva." },
];

export function CheckoutForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function subscribe(planCode: string) {
    setLoading(planCode); setError(null);
    try {
      const response = await fetch("/api/billing/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planCode, payerEmail: email }) });
      const body = await response.json() as { checkoutUrl?: string; message?: string };
      if (!response.ok || !body.checkoutUrl) throw new Error(body.message ?? "Não foi possível iniciar o checkout.");
      window.location.assign(body.checkoutUrl);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível iniciar o checkout.");
      setLoading(null);
    }
  }

  return <section className="checkout-section"><h2>Escolha seu plano</h2><p>O pagamento será concluído com segurança no Mercado Pago.</p><label className="checkout-email">E-mail do pagador<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="financeiro@empresa.com" required /></label><div className="plan-options">{plans.map((plan) => <article className="plan-option" key={plan.code}><div><h3>{plan.name}</h3><p>{plan.description}</p></div><button type="button" disabled={!email || loading !== null} onClick={() => subscribe(plan.code)}>{loading === plan.code ? "Abrindo..." : "Assinar"}</button></article>)}</div>{error && <p className="checkout-error">{error}</p>}</section>;
}
