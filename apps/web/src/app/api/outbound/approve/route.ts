import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!apiBaseUrl) {
    return NextResponse.json({ error: "API_BASE_URL não configurado" }, { status: 500 });
  }

  let body: {
    conversationId?: unknown;
    content?: unknown;
    idempotencyKey?: unknown;
    opportunityId?: unknown;
    suggestionId?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { conversationId, content, idempotencyKey } = body;
  if (
    typeof conversationId !== "string" ||
    conversationId === "" ||
    typeof content !== "string" ||
    content === "" ||
    typeof idempotencyKey !== "string" ||
    idempotencyKey === ""
  ) {
    return NextResponse.json(
      { error: "conversationId, content e idempotencyKey são obrigatórios" },
      { status: 400 }
    );
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|; )saas_lead_session=([^;]*)/);
  const sessionValue = match ? match[1] : "";

  try {
    const apiRes = await fetch(`${apiBaseUrl}/outbound/approvals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sessionValue ? { Cookie: `saas_lead_session=${sessionValue}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = (await apiRes.json().catch(() => ({}))) as unknown;
    return NextResponse.json(data, { status: apiRes.status });
  } catch {
    return NextResponse.json({ error: "Falha ao comunicar com a API" }, { status: 502 });
  }
}
