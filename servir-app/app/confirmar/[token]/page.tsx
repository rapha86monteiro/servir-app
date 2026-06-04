"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getScheduleByToken, updateSchedulePositions } from "@/lib/firestore/schedules";
import { createSubstituicao } from "@/lib/firestore/substituicoes";
import type { Schedule } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea, Select } from "@/components/ui/Input";
import Image from "next/image";

export default function ConfirmarPage() {
  const { token } = useParams<{ token: string }>();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [justification, setJustification] = useState("");
  const [needsSubstitute, setNeedsSubstitute] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [action, setAction] = useState<"confirm" | "decline" | null>(null);

  useEffect(() => {
    async function load() {
      const s = await getScheduleByToken(token);
      setSchedule(s);
      setLoading(false);
    }
    load();
  }, [token]);

  const allSlots = schedule ? Object.values(schedule.positions).flat() : [];
  const uniqueMembers = allSlots.filter(
    (slot, idx, arr) => arr.findIndex((s) => s.memberId === slot.memberId) === idx
  );

  const myPositions = selectedMemberId
    ? Object.entries(schedule?.positions ?? {})
        .filter(([, slots]) => slots.some((s) => s.memberId === selectedMemberId))
        .map(([pos]) => pos)
    : [];

  async function handleSubmit() {
    if (!schedule || !selectedMemberId || !action) return;
    setSubmitting(true);

    const updatedPositions = { ...schedule.positions };
    for (const position in updatedPositions) {
      updatedPositions[position] = updatedPositions[position].map((slot) =>
        slot.memberId === selectedMemberId
          ? {
              ...slot,
              confirmed: action === "confirm",
              justification: action === "decline" ? justification : "",
              needsSubstitute: action === "decline" ? needsSubstitute : false,
            }
          : slot
      );
    }

    await updateSchedulePositions(schedule.id, updatedPositions);

    // Se pediu substituto, criar registro
    if (action === "decline" && needsSubstitute) {
      const slot = allSlots.find((s) => s.memberId === selectedMemberId);
      for (const position of myPositions) {
        await createSubstituicao({
          scheduleId: schedule.id,
          serviceTitle: schedule.serviceTitle,
          serviceDate: schedule.serviceDate,
          serviceTurno: schedule.serviceTurno,
          position,
          teamId: schedule.teamId,
          teamName: schedule.teamName,
          membroId: selectedMemberId,
          membroName: slot?.memberName ?? "",
          justification,
          status: "aberta",
          createdAt: new Date().toISOString(),
        });
      }
    }

    setDone(true);
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent" />
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full">
          <p className="text-gray-500">Escala não encontrada ou link inválido.</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full">
          {action === "confirm" ? (
            <>
              <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Presença confirmada!</h2>
              <p className="text-gray-400 text-sm">Obrigado por confirmar. Até lá! 🙏</p>
            </>
          ) : (
            <>
              {needsSubstitute ? (
                <>
                  <RefreshCw size={48} className="text-blue-500 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Pedido enviado!</h2>
                  <p className="text-gray-400 text-sm">Seu pedido de substituição foi registrado. O líder e a equipe serão notificados.</p>
                </>
              ) : (
                <>
                  <XCircle size={48} className="text-red-400 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Ausência registrada</h2>
                  <p className="text-gray-400 text-sm">Sua justificativa foi enviada ao líder.</p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  const selectedSlot = uniqueMembers.find((s) => s.memberId === selectedMemberId);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-start justify-center p-4 pt-10 pb-10">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center mb-4">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 overflow-hidden">
            <Image src="/logo.png" alt="Belém Church" width={48} height={48} className="object-contain" />
          </div>
          <h1 className="text-white text-lg font-bold">Confirmação de Escala</h1>
          <p className="text-white/40 text-xs mt-0.5">Belém Church · Departamento Servir</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Equipe</p>
            <p className="font-bold text-gray-900 mt-0.5">{schedule.teamName}</p>
            <p className="text-sm text-gray-500">{schedule.serviceTitle} · {schedule.serviceTurno}</p>
            <p className="text-sm text-gray-400">{formatDate(schedule.serviceDate)}</p>
          </div>

          <Select
            label="Selecione seu nome"
            value={selectedMemberId}
            onChange={(e) => { setSelectedMemberId(e.target.value); setAction(null); setJustification(""); setNeedsSubstitute(false); }}
          >
            <option value="">Selecione...</option>
            {uniqueMembers.map((s) => (
              <option key={s.memberId} value={s.memberId}>{s.memberName}</option>
            ))}
          </Select>

          {myPositions.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Suas posições:</p>
              <div className="flex flex-wrap gap-1">
                {myPositions.map((pos) => (
                  <span key={pos} className="text-xs bg-black text-white px-2 py-0.5 rounded-full">{pos}</span>
                ))}
              </div>
            </div>
          )}

          {selectedMemberId && selectedSlot?.confirmed !== undefined && selectedSlot?.confirmed !== null && (
            <div className={`text-sm p-3 rounded-lg ${selectedSlot.confirmed ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              Você já {selectedSlot.confirmed ? "confirmou presença" : "registrou ausência"}. Pode alterar abaixo.
            </div>
          )}

          {selectedMemberId && !action && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setAction("confirm")}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-green-200 hover:border-green-500 hover:bg-green-50 transition-colors active:bg-green-100"
              >
                <CheckCircle2 size={28} className="text-green-500" />
                <span className="text-sm font-semibold text-green-700">Vou estar presente</span>
              </button>
              <button
                onClick={() => setAction("decline")}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-red-200 hover:border-red-400 hover:bg-red-50 transition-colors active:bg-red-100"
              >
                <XCircle size={28} className="text-red-400" />
                <span className="text-sm font-semibold text-red-600">Não poderei ir</span>
              </button>
            </div>
          )}

          {selectedMemberId && action && (
            <div className="space-y-3">
              <div className={`p-3 rounded-lg text-sm font-medium flex items-center justify-between ${action === "confirm" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                <span>{action === "confirm" ? "✅ Confirmando presença" : "❌ Registrando ausência"}</span>
                <button onClick={() => { setAction(null); setNeedsSubstitute(false); }} className="text-xs underline opacity-70">alterar</button>
              </div>

              {action === "decline" && (
                <>
                  <Textarea
                    label="Motivo da ausência (opcional)"
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Ex: Viagem, trabalho, compromisso..."
                  />
                  <label className="flex items-start gap-3 cursor-pointer p-3 bg-blue-50 rounded-xl border-2 border-blue-200">
                    <input
                      type="checkbox"
                      checked={needsSubstitute}
                      onChange={(e) => setNeedsSubstitute(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-blue-600"
                    />
                    <div>
                      <p className="text-sm font-semibold text-blue-700">Preciso de substituto</p>
                      <p className="text-xs text-blue-500 mt-0.5">Um alerta será enviado para a equipe</p>
                    </div>
                  </label>
                </>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-[#0a0a0a] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
              >
                {submitting ? "Enviando..." : "Confirmar resposta"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
