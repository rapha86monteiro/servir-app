import { NextRequest, NextResponse } from "next/server";
import { enviarAlertaSubstituicoesPendentes } from "@/lib/alertaSubstituicoes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cron: avisa sobre substituições ainda em aberto (não aceitas).
// Agendado no vercel.json (10h e 18h, horário de Brasília).
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const isVercelCron = auth === `Bearer ${process.env.CRON_SECRET}`;
  const queryAuth = req.nextUrl.searchParams.get("secret") === process.env.CRON_SECRET;
  if (!isVercelCron && !queryAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const r = await enviarAlertaSubstituicoesPendentes();
    return NextResponse.json({ ok: true, ...r });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? String(err) }, { status: 500 });
  }
}
