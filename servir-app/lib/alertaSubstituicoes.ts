import {
  getAdminApp,
  sendNotificationToTokens,
  getCoordinatorTokens,
  getTokensForUsers,
} from "./firebaseAdmin";

// Envia um push avisando que há pedidos de substituição ainda EM ABERTO
// (não aceitos). Usado pelos crons das 10h e das 18h.
export async function enviarAlertaSubstituicoesPendentes() {
  const admin = getAdminApp();
  const db = admin.firestore();
  const hoje = new Date().toISOString().split("T")[0];

  const snap = await db.collection("substituicoes").where("status", "==", "aberta").get();
  // Só alerta sobre escalas de hoje em diante (ignora pedidos de escalas que já passaram)
  const abertas = snap.docs
    .map((d) => d.data() as any)
    .filter((s) => !s.serviceDate || s.serviceDate >= hoje);

  if (abertas.length === 0) return { count: 0 };

  // Notifica coordenadores + líderes das equipes envolvidas
  const teamIds = [...new Set(abertas.map((s) => s.teamId).filter(Boolean))];
  const leaderUids: string[] = [];
  for (const tid of teamIds) {
    const t = await db.collection("teams").doc(tid).get();
    const data = t.data();
    if (data && Array.isArray(data.leaderIds)) leaderUids.push(...data.leaderIds);
  }

  const [coordTokens, leaderTokens] = await Promise.all([
    getCoordinatorTokens(),
    getTokensForUsers([...new Set(leaderUids)]),
  ]);
  const tokens = [...coordTokens, ...leaderTokens];

  const nomes = abertas.slice(0, 5).map((s) => s.membroName).join(", ");
  const resto = abertas.length > 5 ? ` e +${abertas.length - 5}` : "";
  const titulo = "⏰ Substituições pendentes";
  const msg =
    abertas.length === 1
      ? `${abertas[0].membroName} ainda precisa de substituto em ${abertas[0].serviceTitle}. Toque para resolver.`
      : `${abertas.length} substituições aguardando alguém aceitar: ${nomes}${resto}. Toque para resolver.`;

  const r = await sendNotificationToTokens(tokens, titulo, msg, {
    type: "substituicao",
    url: "/app/substituicoes",
  });

  return { count: abertas.length, ...r };
}
