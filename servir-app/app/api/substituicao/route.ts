import { NextRequest, NextResponse } from "next/server";
import {
  getAdminApp,
  sendNotificationToTokens,
  getCoordinatorTokens,
  getTokensForUsers,
} from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

// Avisa os líderes da equipe + coordenadores sobre um pedido de substituição
// e registra o aviso no Mural. Roda no servidor (firebase-admin), então funciona
// mesmo a partir da página pública de confirmação (que não está logada).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      teamId,
      teamName,
      membroName,
      positions,
      serviceTitle,
      serviceDate,
      serviceTurno,
      justification,
    } = body;

    const a = getAdminApp();
    const db = a.firestore();

    // Líderes da equipe
    let leaderUids: string[] = [];
    if (teamId) {
      const teamSnap = await db.collection("teams").doc(teamId).get();
      const t = teamSnap.data();
      if (t && Array.isArray(t.leaderIds)) leaderUids = t.leaderIds;
    }

    const [coordTokens, leaderTokens] = await Promise.all([
      getCoordinatorTokens(),
      getTokensForUsers(leaderUids),
    ]);
    const tokens = [...coordTokens, ...leaderTokens];

    const posTxt =
      Array.isArray(positions) && positions.length ? ` (${positions.join(", ")})` : "";
    const turnoTxt = serviceTurno ? ` · ${serviceTurno}` : "";

    // Push para líderes + coordenadores
    const pushResult = await sendNotificationToTokens(
      tokens,
      "🔄 Pedido de substituição",
      `${membroName} não poderá ir em ${serviceTitle} (${teamName})${posTxt} e precisa de substituto.`,
      { type: "substituicao", url: "/app/substituicoes" }
    );

    // Registra no Mural (escrita admin, ignora as regras)
    await db.collection("avisos").add({
      titulo: "🔄 Substituição solicitada",
      mensagem: `${membroName} não poderá servir em ${serviceTitle}${turnoTxt} (${teamName})${posTxt} — ${serviceDate}. Precisa de substituto.${
        justification ? ` Motivo: ${justification}` : ""
      }`,
      autor: "Sistema",
      fixado: false,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, notified: tokens.length, ...pushResult });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? String(err) }, { status: 500 });
  }
}
