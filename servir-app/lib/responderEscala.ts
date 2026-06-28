import { updateSchedulePositions } from "./firestore/schedules";
import { createSubstituicao } from "./firestore/substituicoes";
import { notify } from "./notify";
import type { Schedule, PositionSlots } from "./types";

// Responde a uma escala (confirmar presença ou recusar + abrir substituição).
// Usado tanto pela página pública de confirmação quanto pela "Minha Área".
// Retorna as posições da pessoa nessa escala.
export async function responderEscala(
  schedule: Schedule,
  memberId: string,
  memberName: string,
  action: "confirm" | "decline",
  justification: string
): Promise<string[]> {
  const positions: PositionSlots = { ...schedule.positions };
  const myPositions: string[] = [];

  const isMine = (slot: { memberId: string; memberName: string }) =>
    slot.memberId === memberId || (!!memberName && slot.memberName === memberName);

  for (const pos in positions) {
    let found = false;
    positions[pos] = (positions[pos] ?? []).map((slot) => {
      if (isMine(slot)) {
        found = true;
        return {
          ...slot,
          confirmed: action === "confirm",
          justification: action === "decline" ? justification : "",
          needsSubstitute: action === "decline",
        };
      }
      return slot;
    });
    if (found) myPositions.push(pos);
  }

  await updateSchedulePositions(schedule.id, positions);

  if (action === "decline") {
    // 1 pedido por pessoa, com todas as posições
    await createSubstituicao({
      scheduleId: schedule.id,
      serviceTitle: schedule.serviceTitle,
      serviceDate: schedule.serviceDate,
      serviceTurno: schedule.serviceTurno,
      positions: myPositions,
      teamId: schedule.teamId,
      teamName: schedule.teamName,
      membroId: memberId,
      membroName: memberName,
      justification,
      status: "aberta",
      createdAt: new Date().toISOString(),
    });

    // Avisa líderes da equipe + coordenadores (push) e registra no Mural — feito no servidor
    await fetch("/api/substituicao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teamId: schedule.teamId,
        teamName: schedule.teamName,
        membroName: memberName,
        positions: myPositions,
        serviceTitle: schedule.serviceTitle,
        serviceDate: schedule.serviceDate,
        serviceTurno: schedule.serviceTurno,
        justification,
      }),
    }).catch(() => {});
  } else {
    // Confirmação → avisa coordenadores
    await notify(
      { target: "coordinators" },
      {
        title: "✅ Presença confirmada",
        message: `${memberName} — ${schedule.teamName} · ${schedule.serviceTitle}`,
        type: "confirmacao",
        data: { url: "/app/schedules" },
      }
    );
  }

  return myPositions;
}
