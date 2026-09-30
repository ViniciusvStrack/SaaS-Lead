import Link from "next/link";
import "./detail.css";

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await params;
  return <main className="review-page">
    <nav className="review-nav"><Link href="/opportunities">← Oportunidades</Link><span>Dados demonstrativos</span></nav>
    <header className="review-header"><div><p className="eyebrow">ALTA PRIORIDADE</p><h1>Revisar oportunidade</h1><p>Uma proposta enviada há mais de 48 horas ainda não recebeu retorno.</p></div><b className="tag orange">Proposta sem retorno</b></header>
    <div className="review-grid"><section className="review-card"><h2>Mensagem sugerida</h2><p className="review-help">Revisar antes de enviar. A IA sugere; você decide o texto final.</p><label htmlFor="suggestion">Conteúdo da mensagem</label><textarea id="suggestion" defaultValue="Olá, Lucas! Tudo bem? Gostaria de saber se ficou alguma dúvida sobre a proposta que enviamos. Estou à disposição para ajudar."/><div className="policy-check"><b>✓ Verificação de envio</b><span>Consentimento, janela, conta e conteúdo serão revalidados no momento do envio.</span></div><div className="review-actions"><button className="secondary-action">Descartar</button><button className="primary-action">Aprovar e enviar</button></div></section><aside className="review-aside"><section className="review-card"><h2>Contato</h2><strong>Lucas Costa</strong><p>Valor conhecido: R$ 4.900</p></section><section className="review-card"><h2>Por que identificamos</h2><ul><li>Proposta enviada há mais de 48 horas</li><li>Nenhuma resposta recebida desde então</li><li>Regra: opportunity-rules.v1</li></ul></section><section className="review-card"><h2>Segurança</h2><p>Nenhuma mensagem é enviada automaticamente. Alterar o texto invalida qualquer aprovação anterior.</p></section></aside></div>
  </main>;
}
