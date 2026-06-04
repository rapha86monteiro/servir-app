"use client";

import { useEffect, useState } from "react";
import { getSchedules, getSchedulesByTeam } from "@/lib/firestore/schedules";
import { getTeams, getTeamsByLeader } from "@/lib/firestore/teams";
import { getRelatorios } from "@/lib/firestore/relatorios";
import { getTeamColor } from "@/lib/teamColors";
import type { Schedule, Team, Relatorio } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronLeft, ChevronRight, Users, CheckCircle2, XCircle, Trophy, CalendarDays } from "lucide-react";

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export default function RelatorioMensalPage() {
  const { appUser } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  useEffect(() => { load(); }, [appUser]);

  async function load() {
    if (!appUser) return;
    setLoading(true);
    const isAdmin = appUser.role === "admin" || appUser.funcao === "Coordenador";
    const [t, rels] = await Promise.all([
      isAdmin ? getTeams() : getTeamsByLeader(appUser.uid),
      getRelatorios().catch(() => []),
    ]);
    setTeams(t);
    setRelatorios(rels);

    let scheds: Schedule[];
    if (isAdmin) scheds = await getSchedules();
    else {
      const all = await Promise.all(t.map((team) => getSchedulesByTeam(team.id)));
      scheds = all.flat();
    }
    setSchedules(scheds);
    setLoading(false);
  }

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }

  // Escalas do mês
  const monthScheds = schedules.filter((s) => {
    const d = new Date(s.serviceDate + "T12:00:00");
    return d.getMonth() === month && d.getFullYear() === year;
  });

  // Relatórios do mês
  const monthRels = relatorios.filter((r) => {
    const d = new Date(r.serviceDate + "T12:00:00");
    return d.getMonth() === month && d.getFullYear() === year;
  });

  // Totais gerais
  let totalEscalados = 0, totalConfirmados = 0, totalRecusados = 0, totalPendentes = 0;
  const porEquipe: Record<string, { escalados: number; confirmados: number; recusados: number; pendentes: number }> = {};
  const porVoluntario: Record<string, { name: string; teamName: string; count: number; confirmados: number }> = {};

  monthScheds.forEach((s) => {
    if (!s.positions) return;
    const teamName = s.teamName;
    if (!porEquipe[teamName]) porEquipe[teamName] = { escalados: 0, confirmados: 0, recusados: 0, pendentes: 0 };
    Object.values(s.positions).flat().forEach((slot) => {
      totalEscalados++;
      porEquipe[teamName].escalados++;
      if (slot.confirmed === true) { totalConfirmados++; porEquipe[teamName].confirmados++; }
      else if (slot.confirmed === false) { totalRecusados++; porEquipe[teamName].recusados++; }
      else { totalPendentes++; porEquipe[teamName].pendentes++; }

      // Por voluntário
      if (!porVoluntario[slot.memberId]) {
        porVoluntario[slot.memberId] = { name: slot.memberName, teamName: slot.teamName, count: 0, confirmados: 0 };
      }
      porVoluntario[slot.memberId].count++;
      if (slot.confirmed === true) porVoluntario[slot.memberId].confirmados++;
    });
  });

  const percentGeral = totalEscalados > 0 ? Math.round((totalConfirmados / totalEscalados) * 100) : 0;
  const equipesArr = Object.entries(porEquipe).sort(([a], [b]) => a.localeCompare(b));
  const voluntariosArr = Object.values(porVoluntario).sort((a, b) => b.count - a.count);

  // Presença dos relatórios
  const totalPresentes = monthRels.reduce((a, r) => a + (r.presentes || 0), 0);
  const totalAusentes = monthRels.reduce((a, r) => a + (r.ausentes || 0), 0);

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
        <h1 className="text-xl font-bold text-gray-900">Relatório Mensal</h1>
        <p className="text-gray-500 text-sm">Visão consolidada por equipe e voluntário</p>
      </div>

      {/* Navegação de mês */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft size={18} /></button>
        <p className="font-bold text-gray-900">{MONTH_NAMES[month]} {year}</p>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight size={18} /></button>
      </div>

      {monthScheds.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <CalendarDays size={32} className="text-gray-200 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">Nenhuma escala neste mês</p>
        </div>
      ) : (
        <>
          {/* Cards resumo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0a0a0a] rounded-2xl p-4 text-white">
              <CalendarDays size={18} className="text-white/40 mb-2" />
              <p className="text-3xl font-bold">{monthScheds.length}</p>
              <p className="text-white/40 text-xs">Escalas no mês</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <Users size={18} className="text-gray-300 mb-2" />
              <p className="text-3xl font-bold text-gray-900">{totalEscalados}</p>
              <p className="text-gray-400 text-xs">Posições escaladas</p>
            </div>
          </div>

          {/* Termômetro geral */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-900">Confirmação Geral do Mês</p>
              <span className={`text-lg font-bold ${percentGeral >= 80 ? "text-green-600" : percentGeral >= 50 ? "text-amber-600" : "text-red-500"}`}>
                {percentGeral}%
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
              <div className="h-full bg-green-500" style={{ width: `${totalEscalados ? (totalConfirmados / totalEscalados) * 100 : 0}%` }} />
              <div className="h-full bg-red-400" style={{ width: `${totalEscalados ? (totalRecusados / totalEscalados) * 100 : 0}%` }} />
            </div>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="text-green-600">✓ {totalConfirmados} confirmados</span>
              <span className="text-red-500">✗ {totalRecusados} recusados</span>
              <span className="text-gray-400">○ {totalPendentes} pendentes</span>
            </div>
          </div>

          {/* Presença (dos relatórios) */}
          {monthRels.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{monthRels.length}</p>
                <p className="text-xs text-gray-400">Relatórios</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{totalPresentes}</p>
                <p className="text-xs text-gray-400">Presenças</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
                <p className="text-2xl font-bold text-red-500">{totalAusentes}</p>
                <p className="text-xs text-gray-400">Faltas</p>
              </div>
            </div>
          )}

          {/* Por equipe */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="font-bold text-gray-900 text-sm mb-3">Confirmação por Equipe</p>
            <div className="space-y-3">
              {equipesArr.map(([teamName, d]) => {
                const pct = d.escalados > 0 ? Math.round((d.confirmados / d.escalados) * 100) : 0;
                const color = teams.find((t) => t.name === teamName)?.color ?? getTeamColor(teamName).bg;
                return (
                  <div key={teamName}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-sm font-semibold text-gray-800">{teamName}</span>
                      </div>
                      <span className="text-xs text-gray-500">{d.confirmados}/{d.escalados} · {pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Por voluntário */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={16} className="text-yellow-500" />
              <p className="font-bold text-gray-900 text-sm">Quem mais serviu no mês</p>
            </div>
            <div className="space-y-1">
              {voluntariosArr.slice(0, 20).map((v, idx) => (
                <div key={v.name + idx} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? "bg-yellow-100 text-yellow-700" :
                      idx === 1 ? "bg-gray-100 text-gray-600" :
                      idx === 2 ? "bg-orange-100 text-orange-600" : "text-gray-400"
                    }`}>
                      {idx < 3 ? ["🥇","🥈","🥉"][idx] : idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{v.name}</p>
                      <p className="text-xs text-gray-400">{v.teamName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{v.count}x</p>
                    <p className="text-xs text-green-500">{v.confirmados} confirm.</p>
                  </div>
                </div>
              ))}
              {voluntariosArr.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-4">Sem dados</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
