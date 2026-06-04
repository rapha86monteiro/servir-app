"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getServices } from "@/lib/firestore/services";
import { getTeams, getTeamsByLeader } from "@/lib/firestore/teams";
import { getMembers } from "@/lib/firestore/members";
import { getSubstituicoesAbertas } from "@/lib/firestore/substituicoes";
import type { Service, Team, Member, Substituicao } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Cake, ChevronRight, RefreshCw, Calendar } from "lucide-react";
import Link from "next/link";

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const WEEK_DAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const WEEK_DAYS_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const TURNO_COLORS: Record<string, string> = {
  "Manhã": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Tarde": "bg-orange-100 text-orange-700 border-orange-200",
  "Noite": "bg-blue-100 text-blue-700 border-blue-200",
  "Especial": "bg-purple-100 text-purple-700 border-purple-200",
};

function getMonthDay(dateStr: string) {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  return { month: parseInt(parts[1]), day: parseInt(parts[2]) };
}

function getWeekDates() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function dateToISO(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function DashboardPage() {
  const { appUser } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [substituicoes, setSubstituicoes] = useState<Substituicao[]>([]);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const todayISO = dateToISO(now);
  const weekDates = getWeekDates();

  useEffect(() => {
    async function load() {
      if (!appUser) return;
      const isAdmin = appUser.role === "admin" || appUser.funcao === "Coordenador";
      const [svcs, allTeams, allMembers, subs] = await Promise.all([
        getServices(),
        isAdmin ? getTeams() : getTeamsByLeader(appUser.uid),
        getMembers(),
        getSubstituicoesAbertas(),
      ]);
      setServices(svcs);
      setTeams(allTeams);
      setMembers(allMembers);
      setSubstituicoes(subs);
    }
    load();
  }, [appUser]);

  // Cultos da semana atual
  const weekServices = services.filter((s) => {
    const sDate = new Date(s.date + "T12:00:00");
    return sDate >= weekDates[0] && sDate <= new Date(weekDates[6].getTime() + 86400000);
  });

  // Agrupar cultos por dia
  const cultosByDay = weekDates.map((d) => {
    const iso = dateToISO(d);
    const dayServices = weekServices.filter((s) => s.date === iso);
    return { date: d, iso, services: dayServices };
  }).filter((d) => d.services.length > 0);

  // Aniversariantes
  const aniversariantes = members
    .filter((m) => m.aniversario && getMonthDay(m.aniversario)?.month === currentMonth)
    .sort((a, b) => (getMonthDay(a.aniversario)?.day ?? 0) - (getMonthDay(b.aniversario)?.day ?? 0));

  const todayBirthdays = aniversariantes.filter((m) => getMonthDay(m.aniversario)?.day === now.getDate());

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Olá, {appUser?.name?.split(" ")[0]} 👋</h1>
        <p className="text-gray-400 text-sm">Departamento Servir · Belém Church</p>
      </div>

      {/* Alertas urgentes */}
      {todayBirthdays.length > 0 && (
        <div className="space-y-2">
          {todayBirthdays.map((m) => {
            const team = teams.find((t) => t.id === m.teamId);
            return (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-2xl bg-pink-50 border border-pink-200">
                <Cake size={18} className="text-pink-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-pink-700 truncate">🎉 Hoje é aniversário de {m.name}!</p>
                  <p className="text-xs text-pink-600">{team?.name}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cultos da semana */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gray-600" />
            <p className="font-bold text-gray-900">Cultos da Semana</p>
          </div>
          <Link href="/app/calendario" className="text-xs text-gray-400 hover:text-black flex items-center gap-1">
            Calendário <ChevronRight size={12} />
          </Link>
        </div>

        {/* Grade de dias da semana */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {weekDates.map((d, i) => {
            const iso = dateToISO(d);
            const hasService = weekServices.some((s) => s.date === iso);
            const isToday = iso === todayISO;
            return (
              <div key={i} className="text-center">
                <p className="text-[10px] text-gray-400 font-semibold uppercase mb-1">{WEEK_DAYS[d.getDay()]}</p>
                <div className={`mx-auto w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                  isToday ? "bg-black text-white" :
                  hasService ? "bg-blue-50 text-blue-700 border-2 border-blue-300" :
                  "text-gray-300"
                }`}>
                  {d.getDate()}
                </div>
                {hasService && !isToday && (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mx-auto mt-1" />
                )}
              </div>
            );
          })}
        </div>

        {/* Detalhes dos cultos da semana */}
        {cultosByDay.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">Nenhum culto esta semana</p>
        ) : (
          <div className="space-y-3">
            {cultosByDay.map(({ date, iso, services: daySvcs }) => {
              const isToday = iso === todayISO;
              const isPast = date < new Date(todayISO + "T00:00:00");
              return (
                <div key={iso} className={`rounded-xl p-3 border ${isToday ? "bg-gray-900 border-gray-900" : isPast ? "bg-gray-50 border-gray-100 opacity-60" : "bg-white border-gray-100"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <p className={`text-xs font-bold uppercase tracking-wide ${isToday ? "text-white/60" : "text-gray-400"}`}>
                      {WEEK_DAYS_FULL[date.getDay()]} · {String(date.getDate()).padStart(2, "0")}/{String(date.getMonth() + 1).padStart(2, "0")}
                    </p>
                    {isToday && <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">HOJE</span>}
                  </div>
                  <div className="space-y-2">
                    {daySvcs.map((s) => (
                      <div key={s.id} className={`flex items-center justify-between ${isToday ? "text-white" : "text-gray-800"}`}>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${TURNO_COLORS[s.turno] ?? "bg-gray-100 text-gray-600"}`}>
                            {s.turno}
                          </span>
                          <p className="text-sm font-semibold">{s.teamName}</p>
                        </div>
                        <div className="text-right">
                          {s.horario && <p className={`text-xs ${isToday ? "text-white/60" : "text-gray-400"}`}>Culto {s.horario}</p>}
                          {s.horarioChegada && <p className="text-xs font-bold text-red-400">Chegada {s.horarioChegada}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Substituições abertas */}
      {substituicoes.length > 0 && (
        <Link href="/app/substituicoes">
          <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <RefreshCw size={16} className="text-blue-500" />
                <p className="font-bold text-gray-900 text-sm">Pedidos de Substituição</p>
              </div>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                {substituicoes.length} aberto{substituicoes.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-2">
              {substituicoes.slice(0, 3).map((s) => (
                <div key={s.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{s.membroName}</p>
                    <p className="text-xs text-gray-400">{s.position} · {s.teamName} · {formatDate(s.serviceDate)}</p>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                </div>
              ))}
              {substituicoes.length > 3 && (
                <p className="text-xs text-blue-600 text-center pt-1">+{substituicoes.length - 3} pedidos</p>
              )}
            </div>
          </div>
        </Link>
      )}

      {/* Aniversariantes do mês */}
      {aniversariantes.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Cake size={16} className="text-pink-400" />
            <p className="font-bold text-gray-900 text-sm">Aniversariantes de {MONTH_NAMES[currentMonth - 1]}</p>
            <span className="text-xs text-gray-400">({aniversariantes.length})</span>
          </div>
          <div className="space-y-1">
            {aniversariantes.map((m) => {
              const md = getMonthDay(m.aniversario)!;
              const team = teams.find((t) => t.id === m.teamId);
              const isToday = md.day === now.getDate();
              const isPast = md.day < now.getDate();
              return (
                <div key={m.id} className={`flex items-center gap-3 py-1.5 ${isToday ? "bg-pink-50 -mx-2 px-2 rounded-lg" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isToday ? "bg-pink-200 text-pink-700" : isPast ? "bg-gray-100 text-gray-400" : "bg-pink-50 text-pink-500"
                  }`}>
                    {String(md.day).padStart(2, "0")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isToday ? "text-pink-700 font-bold" : isPast ? "text-gray-400" : "text-gray-800"}`}>
                      {m.name} {isToday && "🎉"}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{team?.name}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
