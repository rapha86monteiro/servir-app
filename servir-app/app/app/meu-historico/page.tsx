"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { getSchedules } from "@/lib/firestore/schedules";
import { getMembers } from "@/lib/firestore/members";
import type { Schedule } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Award, CheckCircle2, XCircle, MapPin, TrendingUp, Calendar } from "lucide-react";

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

interface Participacao {
  scheduleId: string;
  serviceTitle: string;
  serviceDate: string;
  serviceTurno: string;
  teamName: string;
  position: string;
  confirmed: boolean | null;
  checkedIn?: boolean | null;
}

export default function MeuHistoricoPage() {
  const { appUser } = useAuth();
  const [participacoes, setParticipacoes] = useState<Participacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [appUser]);

  async function load() {
    const uid = auth.currentUser?.uid ?? appUser?.uid;
    if (!uid) return;
    setLoading(true);
    try {
      const [scheds, members] = await Promise.all([getSchedules(), getMembers()]);
      const meu = members.find((m) => m.uid === uid);
      const meuId = meu?.id;

      const parts: Participacao[] = [];
      scheds.forEach((s: Schedule) => {
        if (!s.positions) return;
        Object.entries(s.positions).forEach(([position, slots]) => {
          slots.forEach((slot) => {
            if (slot.memberId === meuId || slot.memberName === appUser?.name) {
              parts.push({
                scheduleId: s.id,
                serviceTitle: s.serviceTitle,
                serviceDate: s.serviceDate,
                serviceTurno: s.serviceTurno,
                teamName: s.teamName,
                position,
                confirmed: slot.confirmed,
                checkedIn: slot.checkedIn,
              });
            }
          });
        });
      });
      parts.sort((a, b) => b.serviceDate.localeCompare(a.serviceDate));
      setParticipacoes(parts);
    } catch {}
    setLoading(false);
  }

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const totalServido = participacoes.length;
  const esteMs = participacoes.filter((p) => {
    const d = new Date(p.serviceDate + "T12:00:00");
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const presencas = participacoes.filter((p) => p.checkedIn === true || (p.checkedIn == null && p.confirmed === true)).length;
  const faltas = participacoes.filter((p) => p.checkedIn === false || p.confirmed === false).length;
  const percentPresenca = totalServido > 0 ? Math.round((presencas / totalServido) * 100) : 0;

  // Posições mais frequentes
  const posCount: Record<string, number> = {};
  participacoes.forEach((p) => { posCount[p.position] = (posCount[p.position] ?? 0) + 1; });
  const topPosicoes = Object.entries(posCount).sort(([, a], [, b]) => b - a).slice(0, 3);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-black" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Minha Jornada</h1>
        <p className="text-gray-500 text-sm">Seu histórico servindo na Belém Church</p>
      </div>

      {/* Card destaque */}
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Award size={20} className="text-yellow-400" />
          <p className="font-bold">{appUser?.name?.split(" ")[0]}, você já serviu</p>
        </div>
        <p className="text-5xl font-bold">{totalServido}<span className="text-xl text-white/50"> vezes</span></p>
        <p className="text-white/50 text-sm mt-1">{esteMs} {esteMs === 1 ? "vez" : "vezes"} este mês</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
          <CheckCircle2 size={18} className="text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{presencas}</p>
          <p className="text-xs text-gray-400">Presenças</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
          <XCircle size={18} className="text-red-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{faltas}</p>
          <p className="text-xs text-gray-400">Faltas</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
          <TrendingUp size={18} className="text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{percentPresenca}%</p>
          <p className="text-xs text-gray-400">Presença</p>
        </div>
      </div>

      {/* Posições favoritas */}
      {topPosicoes.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={16} className="text-gray-600" />
            <p className="font-bold text-gray-900 text-sm">Onde você mais serve</p>
          </div>
          <div className="space-y-2">
            {topPosicoes.map(([pos, count], idx) => (
              <div key={pos} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{["🥇","🥈","🥉"][idx]} {pos}</span>
                <span className="text-sm font-bold text-gray-900">{count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de participações */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={16} className="text-gray-600" />
          <p className="font-bold text-gray-900 text-sm">Histórico completo</p>
        </div>
        {participacoes.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-6">Você ainda não foi escalado.</p>
        ) : (
          <div className="space-y-2">
            {participacoes.map((p, idx) => {
              const presente = p.checkedIn === true || (p.checkedIn == null && p.confirmed === true);
              const faltou = p.checkedIn === false || p.confirmed === false;
              return (
                <div key={p.scheduleId + idx} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{p.position}</p>
                    <p className="text-xs text-gray-400">{p.serviceTitle} · {formatDate(p.serviceDate)}</p>
                  </div>
                  {presente ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Presente</span>
                  ) : faltou ? (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Faltou</span>
                  ) : (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Escalado</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
