import Link from "next/link";
import "../../command-center.css";
import { CommandCenterLive } from "./command-center-live";

export default function CommandCenterPage() {
  return <main className="command-center">
    <header className="command-header"><div><p className="command-kicker">CENTRAL DE ORQUESTRACAO</p><h1>Escritorio de agentes</h1><p>Acompanhe o estado real da coordenacao sem depender de mensagens manuais.</p></div></header>
    <CommandCenterLive />
    <p className="command-note"><b>Fonte real:</b> o painel consulta o BOARD e os inboxes locais a cada 5 segundos.</p>
    <p style={{maxWidth:1380,margin:"18px auto 0",fontSize:11}}><Link href="/" style={{color:"#657080",textDecoration:"none"}}>Voltar para a visao geral</Link></p>
  </main>;
}
