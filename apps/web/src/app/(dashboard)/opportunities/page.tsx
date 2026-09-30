import Link from "next/link";

export default function OpportunitiesPage() {
  return <main className="simple-page"><Link className="back" href="/">← Visão geral</Link><p className="eyebrow">PIPELINE COMERCIAL</p><h1>Oportunidades</h1><p className="subtitle">Sinais comerciais priorizados com regras determinísticas e evidências da conversa.</p><div className="demo-notice compact"><span>Dados demonstrativos</span> Os valores abaixo não representam receita recuperada.</div><section className="opportunities-table"><header><span>Contato e oportunidade</span><span>Motivo identificado</span><span>Valor conhecido</span><span>Prioridade</span></header><Row name="Lucas Costa" type="Proposta sem retorno" reason="Proposta enviada há mais de 48 horas" value="R$ 4.900" priority="Alta" color="orange"/><Row name="Marina Rocha" type="Lead aguardando resposta" reason="Mensagem recebida há 6 horas, sem resposta" value="—" priority="Urgente" color="red"/><Row name="Ana Souza" type="Conversa esfriando" reason="Última resposta da empresa há 4 dias" value="—" priority="Média" color="purple"/></section></main>;
}

function Row({name,type,reason,value,priority,color}:{name:string;type:string;reason:string;value:string;priority:string;color:string}) {
  return <article><span><strong>{name}</strong><small>{type}</small></span><span>{reason}</span><b>{value}</b><i className={`tag ${color}`}>{priority}</i></article>;
}
