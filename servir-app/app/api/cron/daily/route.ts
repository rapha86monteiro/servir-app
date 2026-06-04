import { NextRequest, NextResponse } from "next/server";
import { getAdminApp, sendNotificationToTokens, getAllUserTokens, getTokensByMemberIds } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Proteção: Vercel Cron injeta header / ou usar query
  const auth = req.headers.get("authorization");
  const isVercelCron = auth === `Bearer ${process.env.CRON_SECRET}`;
  const queryAuth = req.nextUrl.searchParams.get("secret") === process.env.CRON_SECRET;
  if (!isVercelCron && !queryAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const app = getAdminApp();
  const db = app.firestore();

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const isMonday = now.getDay() === 1;

  const results: any = {};

  try {
    // 1) Aniversariantes do dia
    const membersSnap = await db.collection("members").get();
    const aniversariantesHoje: any[] = [];
    const aniversariantesSemana: any[] = [];

    membersSnap.docs.forEach((d) => {
      const m = d.data();
      if (!m.aniversario) return;
      const parts = m.aniversario.split("-");
      if (parts.length !== 3) return;
      const mes = parseInt(parts[1]);
      const dia = parseInt(parts[2]);
      if (mes === month && dia === day) aniversariantesHoje.push(m);
      // Aniversariantes da semana (próximos 7 dias)
      if (mes === month && dia >= day && dia <= day + 6) aniversariantesSemana.push(m);
    });

    if (aniversariantesHoje.length > 0) {
      const tokens = await getAllUserTokens();
      const names = aniversariantesHoje.map((m) => m.name.split(" ")[0]).join(", ");
      const r = await sendNotificationToTokens(
        tokens,
        `🎂 Aniversário hoje!`,
        aniversariantesHoje.length === 1
          ? `Hoje é aniversário de ${aniversariantesHoje[0].name}! Mande uma mensagem 💙`
          : `Hoje fazem aniversário: ${names}. Mande uma mensagem 💙`,
        { type: "birthday", url: "/app/members" }
      );
      results.aniversariantesHoje = { count: aniversariantesHoje.length, ...r };
    }

    // 2) Aniversariantes da semana (só segunda)
    if (isMonday && aniversariantesSemana.length > 0) {
      const tokens = await getAllUserTokens();
      const lista = aniversariantesSemana.map((m) => {
        const dia = parseInt(m.aniversario.split("-")[2]);
        return `${String(dia).padStart(2, "0")} - ${m.name.split(" ")[0]}`;
      }).join("\n");
      const r = await sendNotificationToTokens(
        tokens,
        `🎉 Aniversariantes desta semana`,
        `Esta semana fazem aniversário:\n${lista}`,
        { type: "birthday-week", url: "/app/members" }
      );
      results.aniversariantesSemana = { count: aniversariantesSemana.length, ...r };
    }

    // 3) Lembrete de cultos amanhã
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowISO = tomorrow.toISOString().split("T")[0];

    const servicesSnap = await db.collection("services").where("date", "==", tomorrowISO).get();
    const schedulesSnap = await db.collection("schedules").where("serviceDate", "==", tomorrowISO).get();

    const memberIdsEscalados: string[] = [];
    schedulesSnap.docs.forEach((d) => {
      const sched = d.data();
      if (sched.positions) {
        Object.values(sched.positions).forEach((slots: any) => {
          if (Array.isArray(slots)) {
            slots.forEach((slot: any) => {
              if (slot.memberId) memberIdsEscalados.push(slot.memberId);
            });
          }
        });
      }
    });

    if (memberIdsEscalados.length > 0 && servicesSnap.docs.length > 0) {
      const tokens = await getTokensByMemberIds([...new Set(memberIdsEscalados)]);
      const svc = servicesSnap.docs[0].data();
      const r = await sendNotificationToTokens(
        tokens,
        `⏰ Culto amanhã!`,
        `Você está escalado para ${svc.title} amanhã. Chegada ${svc.horarioChegada || svc.horario || "no horário combinado"}.`,
        { type: "reminder", url: "/app/schedules" }
      );
      results.lembreteCulto = { membersCount: memberIdsEscalados.length, ...r };
    }

    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? String(err) }, { status: 500 });
  }
}
