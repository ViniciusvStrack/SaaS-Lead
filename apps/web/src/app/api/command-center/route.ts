import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

type Task = { id: string; title: string; owner: string; status: string; files: string; updated: string };

async function readCoordinationFile(name: string) {
  for (const file of [path.resolve(process.cwd(), ".ai-coordination", name), path.resolve(process.cwd(), "../../.ai-coordination", name)]) {
    try { return await readFile(file, "utf8"); } catch { /* try the workspace root */ }
  }
  return "";
}

function parseBoard(board: string): Task[] {
  return board.split(/\r?\n/).filter((line) => line.startsWith("|") && !line.startsWith("| ID") && !line.startsWith("|---"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 7 && Boolean(cells[0]) && cells[0] !== "—")
    .map((cells) => ({ id: cells[0] ?? "", title: cells[1] ?? "", owner: cells[2] ?? "", files: cells[4] ?? "", status: cells[5] ?? "", updated: cells[6] ?? "" }));
}

function parseMessages(inbox: string) {
  return inbox.split(/\r?\n/).filter((line) => line.startsWith("[")).slice(-12).reverse().map((line) => {
    const match = line.match(/^\[([^\]]+)\]\s+([^|]+)\|\s*Tarefa:\s*([^|]+)\|\s*Mensagem:\s*(.*?)(?:\s*\|\s*Pedido:.*)?$/);
    return match ? { at: match[1] ?? "", from: (match[2] ?? "").trim(), task: (match[3] ?? "").trim(), message: (match[4] ?? "").trim() } : { at: "", from: "coordenação", task: "evento", message: line };
  });
}

export async function GET() {
  const [board, codexInbox, openCodeInbox] = await Promise.all([readCoordinationFile("BOARD.md"), readCoordinationFile("messages/codex.md"), readCoordinationFile("messages/opencode.md")]);
  const tasks = parseBoard(board);
  const messages = [...parseMessages(codexInbox), ...parseMessages(openCodeInbox)].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 18);
  return NextResponse.json({ source: board ? "local-coordination" : "unavailable", syncedAt: new Date().toISOString(), tasks, messages }, { headers: { "Cache-Control": "no-store" } });
}
