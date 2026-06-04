"use client";

import { useEffect, useState } from "react";
import { ReportTabs } from "@/components/layout/ReportTabs";
import { getRelatorios } from "@/lib/firestore/relatorios";
import { getSchedules, getSchedulesByTeam } from "@/lib/firestore/schedules";
import { getTeams, getTeamsByLeader } from "@/lib/firestore/teams";
import type { Relatorio, Schedule, Team } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/utils";
import { ChevronDown, ChevronUp, Trophy, AlertTriangle, Search } from "lucide-react";

const AVALIACAO_COLORS: Record<string, string> = {
  "Ótimo": "bg-green-100 text-green-700 border-green-300",
  "Bom": "bg-blue-100 text-blue-700 border-blue-300",
  "Regular": "bg-yellow-100 text-yellow-700 border-yellow-300",
  "Precisa melhorar": "bg-red-100 text-red-700 border-red-300",
};

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export default function HistoricoPage() {
  const { appUser } = useAuth();
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterTeam, setFilterTeam] = useState("");

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  useEffect(() => { load(); }, [appUser]);

  async function load() {
    if (!appUser) return;
    setLoading(true);
    const [rels, t] = await Promise.all([
      getRelatorios(),
      appUser.role === "admin" ? getTeams() : getTeamsByLeader(appUser.uid),
    ]);
    setTeams(t);
    setRelatorios(rels);

    let scheds: Schedule[];
    if (appUser.role === "admin") {
      scheds = await getSchedules();
    } else {
      const all = await Promise.all(t.map((team) => getSchedulesByTeam(team.id)));
      scheds = all.flat();
    }
    setSchedules(scheds);
    setLoading(false);
  }

  // Escalados no mês atual
  const thisMonthScheds = schedules.filter((s) => {
    const d = new Date(s.serviceDate);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const memberScaleCount: Record<string, { name: string; count: number; teamName: string }> = {};
  thisMonthScheds.forEach((s) => {
    if (!s.positions) return;
    Object.values(s.positions).flat().forEach((slot) => {
      if (!memberScaleCount[slot.memberId]) {
        memberScaleCount[slot.memberId] = { name: slot.memberName, count: 0, teamName: slot.teamName };
      }
      memberScaleCount[slot.memberId].count++;
    });
  });
  const maisEscalados = Object.values(memberScaleCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Mais faltaram no mês atual
  const memberFaltaCount: Record<string, { name: string; count: number; teamName: string }> = {};
  thisMonthScheds.forEach((s) => {
    if (!s.positions) return;
    Object.values(s.positions).flat().forEach((slot) => {
      if (slot.confirmed === false) {
        if (!memberFaltaCount[slot.memberId]) {
          memberFaltaCount[slot.memberId] = { name: slot.memberName, count: 0, teamName: slot.teamName };
        }
        memberFaltaCount[slot.memberId].count++;
      }
    });
  });
  const maisFaltaram = Object.values(memberFaltaCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Totais
  const totalPresencas = relatorios.reduce((acc, r) => acc + (r.presentes || 0), 0);
  const totalFaltas = relatorios.reduce((acc, r) => acc + (r.ausentes || 0), 0);

  // Filtros
  const filtered = relatorios.filter((r) => {
    const matchSearch = r.serviceTitle.toLowerCase().includes(search.toLowerCase()) ||
      r.teamName.toLowerCase().includes(search.toLowerCase());
    const matchTeam = !filterTeam || r.teamId === filterTeam;
    return matchSearch && matchTeam;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-gray-500 text-sm">Histórico de relatórios enviados</p>
      </div>

      <ReportTabs />

      {/* Totais */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">{relatorios.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Relatórios</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{totalPresencas}</p>
          <p className="text-xs text-gray-400 mt-0.5">Presenças</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
          <p className="text-2xl font-bold text-red-500">{totalFaltas}</p>
          <p className="text-xs text-gray-400 mt-0.5">Faltas</p>
        </div>
      </div>

      {/* Rankings do mês */}
      <div className="grid sm:grid-cols-2 gap-3">
        {/* Mais escalados */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={16} className="text-yellow-500" />
            <p className="font-semibold text-gray-900 text-sm">Mais Escalados</p>
            <span className="text-xs text-gray-400">{MONTH_NAMES[currentMonth]}</span>
          </div>
          {maisEscalados.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">Sem dados este mês</p>
          ) : (
            <ul className="space-y-2">
              {maisEscalados.map((m, idx) => (
                <li key={m.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? "bg-yellow-100 text-yellow-700" :
                      idx === 1 ? "bg-gray-100 text-gray-600" :
                      idx === 2 ? "bg-orange-100 text-orange-600" : "text-gray-400"
                    }`}>
                      {idx < 3 ? ["🥇","🥈","🥉"][idx] : `${idx + 1}º`}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.teamName}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-blue-600">{m.count} escala{m.count !== 1 ? "s" : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Mais faltaram */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-400" />
            <p className="font-semibold text-gray-900 text-sm">Mais Faltaram</p>
            <span className="text-xs text-gray-400">{MONTH_NAMES[currentMonth]}</span>
          </div>
          {maisFaltaram.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">Sem dados este mês</p>
          ) : (
            <ul className="space-y-2">
              {maisFaltaram.map((m, idx) => (
                <li key={m.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center text-xs font-bold text-red-400">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.teamName}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-red-500">{m.count} falta{m.count !== 1 ? "s" : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar relatório..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Todas as equipes</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {/* Lista de relatórios */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-700">Relatórios Enviados</p>
        {filtered.map((r) => {
          const expanded = expandedId === r.id;
          const avColor = AVALIACAO_COLORS[r.avaliacao] ?? "bg-gray-100 text-gray-600";
          return (
            <div key={r.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedId(expanded ? null : r.id)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{r.serviceTitle}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${avColor}`}>
                        {r.avaliacao}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(r.serviceDate)} · {r.teamName}</p>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      <div className="text-center">
                        <p className="text-base font-bold text-green-600">{r.presentes}</p>
                        <p className="text-xs text-gray-400">Pres.</p>
                      </div>
                      <div className="text-center">
                        <p className="text-base font-bold text-red-500">{r.ausentes}</p>
                        <p className="text-xs text-gray-400">Aus.</p>
                      </div>
                      <div className="text-center">
                        <p className="text-base font-bold text-blue-500">{r.substitutos}</p>
                        <p className="text-xs text-gray-400">Subs.</p>
                      </div>
                      <div className="text-center">
                        <p className="text-base font-bold text-gray-500">{r.fotos?.length ?? 0}</p>
                        <p className="text-xs text-gray-400">📷</p>
                      </div>
                    </div>
                  </div>
                  {expanded
                    ? <ChevronUp size={16} className="text-gray-400 mt-1 ml-2 flex-shrink-0" />
                    : <ChevronDown size={16} className="text-gray-400 mt-1 ml-2 flex-shrink-0" />
                  }
                </div>
              </button>

              {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
                  {r.observacoes && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Observações</p>
                      <p className="text-sm text-gray-700">{r.observacoes}</p>
                    </div>
                  )}
                  {r.ocorrencias && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Ocorrências</p>
                      <p className="text-sm text-gray-700">{r.ocorrencias}</p>
                    </div>
                  )}
                  {r.fotos?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Fotos</p>
                      <div className="flex gap-2 flex-wrap">
                        {r.fotos.map((foto, idx) => (
                          <img key={idx} src={foto} alt="" className="w-20 h-20 object-cover rounded-xl" />
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-400">Enviado por {r.liderName}</p>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <p className="text-gray-400 text-sm">Nenhum relatório encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
