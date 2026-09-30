import Link from "next/link";

const conversations = [
  ["MR", "Marina Rocha", "Gostaria de entender qual plano atende...", "2 min", "violet"],
  ["LC", "Lucas Costa", "Vocês conseguem fazer uma proposta?", "18 min", "blue"],
  ["AS", "Ana Souza", "Vou conversar com meu sócio e retorno.", "1 h", "amber"],
];
const opportunities = [
  ["opp-1", "Proposta sem retorno", "Lucas Costa", "R$ 4.900", "Alta", "orange"],
  ["opp-2", "Lead aguardando resposta", "Marina Rocha", "A qualificar", "Urgente", "red"],
  ["opp-3", "Conversa esfriando", "Ana Souza", "A qualificar", "Média", "purple"],
];

const Icon = ({ children }: { children: string }) => <span className="icon" aria-hidden="true">{children}</span>;

export default function HomePage() {
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><b>S</b><span>SaaS Lead</span></div>
      <nav aria-label="Navegação principal">
        <Link className="nav-item active" href="/"><Icon>⌘</Icon>Visão geral</Link>
        <Link className="nav-item" href="#conversas"><Icon>◌</Icon>Conversas<em>8</em></Link>
        <Link className="nav-item" href="/opportunities"><Icon>✦</Icon>Oportunidades<em className="accent">5</em></Link>
        <Link className="nav-item" href="#analytics"><Icon>⌁</Icon>Analytics</Link>
      </nav>
      <div className="sidebar-bottom"><Link className="nav-item" href="/settings"><Icon>⚙</Icon>Configurações</Link><div className="profile"><span className="avatar dark">VS</span><span><strong>Vinicius Strack</strong><small>Administrador</small></span><button>•••</button></div></div>
    </aside>
    <main className="dashboard">
      <header className="topbar"><div><p className="eyebrow">QUARTA-FEIRA, 30 DE SETEMBRO</p><h1>Boa tarde, Vinicius.</h1><p className="subtitle">Aqui está o que merece sua atenção hoje.</p></div><div className="top-actions"><label className="search"><span>⌕</span><input aria-label="Buscar" placeholder="Buscar" /></label><button className="notify" aria-label="Notificações">♧<i /></button></div></header>
      <div className="demo-notice"><span>Dados demonstrativos</span> Conecte seu WhatsApp para acompanhar conversas reais.<Link href="/onboarding" style={{marginLeft:"auto",color:"#2670d5",fontWeight:650,textDecoration:"none"}}>Configurar conexão →</Link></div>
      <section className="metrics" aria-label="Indicadores">
        <Metric title="Conversas ativas" value="24" note="8 aguardando sua equipe" trend="+12%" color="blue" />
        <Metric title="Oportunidades ativas" value="5" note="2 com alta prioridade" trend="+3" color="violet" />
        <Metric title="Valor conhecido" value="R$ 18,4 mil" note="Em oportunidades identificadas" trend="Este mês" color="green" />
      </section>
      <section className="focus-card"><div className="section-heading"><div><span className="section-icon">✦</span><span><h2>Prioridades de hoje</h2><p>Oportunidades identificadas por regras e sinais de IA</p></span></div><Link href="/opportunities">Ver todas →</Link></div><div className="opportunity-list">{opportunities.map(([id,label,company,value,priority,color])=><article className="opportunity-row" key={company}><i className={`dot ${color}`} /><span><strong>{label}</strong><small>{company}</small></span><span className="opportunity-value"><small>Valor conhecido</small><strong>{value}</strong></span><b className={`tag ${color}`}>{priority}</b><Link aria-label={`Abrir ${company}`} href={`/opportunities/${id}`}>›</Link></article>)}</div></section>
      <section className="lower-grid" id="conversas"><article className="panel"><div className="panel-title"><div><h2>Conversas recentes</h2><p>Atualizadas em tempo real</p></div><button>Ver caixa de entrada</button></div>{conversations.map(([initials,name,message,time,color])=><div className="conversation" key={name}><span className={`avatar ${color}`}>{initials}</span><span><strong>{name}</strong><p>{message}</p></span><time>{time}</time></div>)}</article><article className="panel pulse" id="analytics"><div className="panel-title"><div><h2>Pulso comercial</h2><p>Últimos 7 dias</p></div><span className="live"><i/>Ao vivo</span></div><div className="donut"><span><strong>72%</strong><small>respondidas</small></span></div><div className="pulse-stats"><span><i className="blue"/><b>31</b><small>Recebidas</small></span><span><i/><b>22</b><small>Respondidas</small></span></div></article></section>
    </main>
  </div>;
}

function Metric({ title, value, note, trend, color }: { title: string; value: string; note: string; trend: string; color: string }) {
  return <article><div className="metric-head"><span>{title}</span><b>{trend}</b></div><strong>{value}</strong><p>{note}</p><div className={`mini-bars ${color}`}>{[28,42,37,66,54,80,94].map((height,index)=><i key={index} style={{height:`${height}%`}} />)}</div></article>;
}
