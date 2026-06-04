"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getScheduleByToken, confirmSlot } from "@/lib/firestore/schedules";
import type { Schedule, ScheduleSlot } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { CheckCircle2, XCircle, ChurchIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Input";

export default function ConfirmarPage() {
  const { token } = useParams<{ token: string }>();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState("");
  const [justification, setJustification] = useState("");
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

  async function handleSubmit() {
    if (!schedule || !selectedMember || !action) return;
    setSubmitting(true);

    const updatedSlots: ScheduleSlot[] = schedule.slots.map((s) =>
      s.memberId === selectedMember
        ? { ...s, confirmed: action === "confirm", justification: action === "decline" ? justification : "" }
        : s
    );

    await confirmSlot(schedule.id, updatedSlots);
    setDone(true);
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full">
          <p className="text-gray-500">Escala não encontrada ou link inválido.</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full">
          {action === "confirm" ? (
            <>
              <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Presença confirmada!</h2>
              <p className="text-gray-500 text-sm">Obrigado por confirmar sua presença. Até lá!</p>
            </>
          ) : (
            <>
              <XCircle size={48} className="text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Ausência registrada</h2>
              <p className="text-gray-500 text-sm">Sua justificativa foi enviada ao líder. Fique bem!</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const alreadyConfirmed = selectedMember
    ? schedule.slots.find((s) => s.memberId === selectedMember)?.confirmed
    : undefined;

  return (
    <div className="min-h-screen bg-slate-900 flex items-start justify-center p-4 pt-12">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ChurchIcon size={28} className="text-white" />
          </div>
          <h1 className="text-white text-xl font-bold">Confirmação de Escala</h1>
          <p className="text-slate-400 text-sm mt-1">Departamento Servir</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xl space-y-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Equipe</p>
            <p className="font-bold text-gray-900 mt-0.5">{schedule.teamName}</p>
            <p className="text-sm text-gray-500 mt-1">{schedule.serviceTitle}</p>
            <p className="text-sm text-gray-400">{formatDate(schedule.serviceDate)}</p>
          </div>

          <Select
            label="Selecione seu nome"
            value={selectedMember}
            onChange={(e) => { setSelectedMember(e.target.value); setAction(null); setJustification(""); }}
          >
            <option value="">Selecione...</option>
            {schedule.slots.map((s) => (
              <option key={s.memberId} value={s.memberId}>{s.memberName}</option>
            ))}
          </Select>

          {selectedMember && alreadyConfirmed !== undefined && alreadyConfirmed !== null && (
            <div className={`text-sm p-3 rounded-lg ${alreadyConfirmed ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              Você já {alreadyConfirmed ? "confirmou presença" : "registrou ausência"} nesta escala.
              Pode alterar abaixo se necessário.
            </div>
          )}

          {selectedMember && (
            <>
              {!action ? (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setAction("confirm")}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-green-200 hover:border-green-500 hover:bg-green-50 transition-colors"
                  >
                    <CheckCircle2 size={28} className="text-green-500" />
                    <span className="text-sm font-semibold text-green-700">Vou estar presente</span>
                  </button>
                  <button
                    onClick={() => setAction("decline")}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-red-200 hover:border-red-400 hover:bg-red-50 transition-colors"
                  >
                    <XCircle size={28} className="text-red-400" />
                    <span className="text-sm font-semibold text-red-600">Não poderei ir</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg text-sm font-medium ${action === "confirm" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                    {action === "confirm" ? "✅ Confirmando presença" : "❌ Registrando ausência"}
                    <button onClick={() => setAction(null)} className="ml-2 underline text-xs">alterar</button>
                  </div>

                  {action === "decline" && (
                    <Textarea
                      label="Motivo da ausência (opcional)"
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      placeholder="Ex: Viagem, trabalho, compromisso familiar..."
                    />
                  )}

                  <Button className="w-full" size="lg" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? "Enviando..." : "Confirmar resposta"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
