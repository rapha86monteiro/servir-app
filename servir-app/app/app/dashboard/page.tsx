"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getServices } from "@/lib/firestore/services";
import { getSchedules, getSchedulesByTeam } from "@/lib/firestore/schedules";
import { getTeamsByLeader, getTeams } from "@/lib/firestore/teams";
import { getMembers } from "@/lib/firestore/members";
import { getRelatorios } from "@/lib/firestore/relatorios";
import { getSubstituicoesAbertas } from "@/lib/firestore/substituicoes";
import type { Service, Schedule, Team, Member, Relatorio, Substituicao } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { CalendarDays, ClipboardList, Users, CheckCircle2, Cake, ChevronRight, Bell, RefreshCw, AlertTriangle } from "lucide-react";
import Link from "next/link";

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const TURNO_COLORS: Record<string, string> = {
  "Manhã": "bg-yellow-100 text-yellow-700",
  "Tarde": "bg-orange-100 text-orange-700",
  "Noite": "bg-blue-100 text-blue-700",
  "Especial": "bg-purple-100 text-purple-700",
};
const AVALIACAO_COLORS: Record<string, string> = {
  "Ótimo": "text-green-600", "Bom": "text-blue-600",
  "Regular": "text-yellow-600", "Precisa melhorar": "text-red-500",
};

function getMonthDay(dateStr: string) {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  return { month: parseInt(parts[1]), day: parseInt(parts[2]) };
}

function daysUntil(dateStr: string) {
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(dateStr + "T12:00:00");
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function DashboardPage() {
  const { appUser } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [substituicoes, setSubstituicoes] = useState<Substituicao[]>([]);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const today = now.toISOString().split("T")[0];

  useEffect(() => {
    async function load() {
      if (!appUser) return;
      const [svcs, allTeams, allMembers, rels, subs] = await Promise.all([
        getServices(),
        appUser.role === "admin" ? getTeams() : getTeamsByLeader(appUser.uid),
        getMembers(),
        getRelatorios(),
        getSubstituicoesAbertas(),
      ]);
      setServices(svcs);
      setTeams(allTeams);
      setMembers(allMembers);
      setRelatorios(rels);
      setSubstituicoes(subs);

      let scheds: Schedule[];
      if (appUser.role === "admin") {
        scheds = await getSchedules();
      } else {
        const all = await Promise.all(allTeams.map((t) => getSchedulesByTeam(t.id)));
        scheds = all.flat();
      }
      setSchedules(scheds);
    }
    load();
  }, [appUser]);

  const pendingConfirmations = schedules.reduce((acc, s) => {
    if (!s.positions) return acc;
    return acc + Object.values(s.positions).flat().filter((sl) => sl.confirmed === null).length;
  }, 0);

  const confirmedCount = schedules.reduce((acc, s) => {
    if (!s.positions) return acc;
    return acc + Object.values(s.positions).flat().filter((sl) => sl.confirmed === true).length;
  }, 0);

  const upcomingServices = services
    .filter((s) => s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const aniversariantes = members
    .filter((m) => m.aniversario && getMonthDay(m.aniversario)?.month === currentMonth)
    .sort((a, b) => (getMonthDay(a.aniversario)?.day ?? 0) - (getMonthDay(b.aniversario)?.day ?? 0));

  const todayBirthdays = aniversariantes.filter((m) => getMonthDay(m.aniversario)?.day === now.getDate());
  const weekBirthdays = aniversariantes.filter((m) => {
    const d = getMonthDay(m.aniversario)?.day ?? 0;
    return d > now.getDate() && d <= now.getDate() + 7;
  });

  const nextSchedule = upcomingServices[0];
  const daysToNext = nextSchedule ? daysUntil(nextSchedule.date) : null;

  const latestSchedule = schedules.sort((a, b) => b.serviceDate.localeCompare(a.serviceDate))[0];
  const latestTotal = latestSchedule?.positions ? Object.values(latestSchedule.positions).flat().length : 0;
  const latestConfirmed = latestSchedule?.positions ? Object.values(latestSchedule.positions).flat().filter((s) => s.confirmed === true).length : 0;
  const lastRelatorio = relatorios[0];

  // Alertas
  const alerts = [
    ...substituicoes.map((s) => ({
      type: "substituicao" as const,
      icon: RefreshCw,
      color: "bg-blue-50 border-blue-200 text-blue-700",
      iconColor: "text-blue-500",
      message: `${s.membroName} precisa de substituto`,
      sub: `${s.serviceTitle} · ${s.position}`,
      href: "/app/substituicoes",
    })),
    ...todayBirthdays.map((m) => ({
      type: "birthday" as const,
      icon: Cake,
      color: "bg-pink-50 border-pink-200 text-pink-700",
      iconColor: "text-pink-400",
      message: `🎂 Hoje é aniversário de ${m.name}!`,
      sub: teams.find((t) => t.id === m.teamId)?.name ?? "",
      href: "/app/members",
    })),
    ...(daysToNext !== null && daysToNext <= 3 && daysToNext >= 0 ? [{
      type: "escala" as const,
      icon: AlertTriangle,
      color: "bg-amber-50 border-amber-200 text-amber-700",
      iconColor: "text-amber-500",
      message: daysToNext === 0 ? "Culto hoje!" : `Culto em ${daysToNext} dia${daysToNext !== 1 ? "s" : ""}`,
      sub: `${nextSchedule!.teamName} · ${nextSchedule!.turno}`,
      href: "/app/schedules",
    }] : []),
    ...(pendingConfirmations > 0 ? [{
      type: "pending" as const,
      icon: Bell,
      color: "bg-amber-50 border-amber-200 text-amber-700",
      iconColor: "text-amber-500",
      message: `${pendingConfirmations} confirmação${pendingConfirmations !== 1 ? "ões" : ""} pendente${pendingConfirmations !== 1 ? "s" : ""}`,
      sub: "Toque para ver as escalas",
      href: "/app/schedules",
    }] : []),
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Olá, {appUser?.name?.split(" ")[0]} 👋</h1>
        <p className="text-gray-400 text-sm">Departamento Servir · Belém Church</p>
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <Link key={idx} href={alert.href}>
              <div className={`flex items-center gap-3 p-3 rounded-2xl border ${alert.color}`}>
                <alert.icon size={18} className={`flex-shrink-0 ${alert.iconColor}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{alert.message}</p>
                  {alert.sub && <p className="text-xs opacity-70">{alert.sub}</p>}
                </div>
                <ChevronRight size={15} className="flex-shrink-0 opacity-50" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0a0a0a] rounded-2xl p-4 text-white">
          <CalendarDays size={20} className="text-white/40 mb-2" />
          <p className="text-3xl font-bold">{upcomingServices.length}</p>
          <p className="text-white/40 text-xs mt-0.5">Próximos Cultos</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <ClipboardList size={20} className="text-gray-300 mb-2" />
          <p className="text-3xl font-bold text-gray-900">{schedules.length}</p>
          <p className="text-gray-400 text-xs mt-0.5">Escalas</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <CheckCircle2 size={20} className="text-green-400 mb-2" />
          <p className="text-3xl font-bold text-gray-900">{confirmedCount}</p>
          <p className="text-gray-400 text-xs mt-0.5">Confirmações</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <Users size={20} className="text-gray-300 mb-2" />
          <p className="text-3xl font-bold text-gray-900">{members.length}</p>
          <p className="text-gray-400 text-xs mt-0.5">Membros</p>
        </div>
      </div>

      {/* Próximos cultos */}
      {upcomingServices.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-gray-900 text-sm">Próximos Cultos</p>
            <Link href="/app/calendario" className="text-xs text-gray-400 hover:text-black flex items-center gap-1">
              Calendário <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingServices.map((s) => {
              const days = daysUntil(s.date);
              return (
                <div key={s.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${days === 0 ? "bg-[#0a0a0a]" : "bg-gray-100"}`}>
                    <p className={`text-[10px] font-bold leading-none ${days === 0 ? "text-white/70" : "text-gray-500"}`}>
                      {new Date(s.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" }).toUpperCase().replace(".", "")}
                    </p>
                    <p className={`text-sm font-bold leading-none mt-0.5 ${days === 0 ? "text-white" : "text-gray-900"}`}>
                      {new Date(s.date + "T12:00:00").getDate()}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{s.teamName}</p>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${TURNO_COLORS[s.turno] ?? "bg-gray-100 text-gray-600"}`}>
                        {s.turno}
                      </span>
                      {s.horario && <span className="text-xs text-gray-400">{s.horario}</span>}
                    </div>
                  </div>
                  {s.horarioChegada && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-400">Chegada</p>
                      <p className="text-sm font-bold text-red-500">{s.horarioChegada}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Substituições abertas */}
      {substituicoes.length > 0 && (
        <Link href="/app/substituicoes">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold text-gray-900 text-sm">Pedidos de Substituição</p>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{substituicoes.length} aberto{substituicoes.length !== 1 ? "s" : ""}</span>
            </div>
            {substituicoes.slice(0, 2).map((s) => (
              <div key={s.id} className="flex items-center gap-2 py-1.5 border-b last:border-0">
                <RefreshCw size={14} className="text-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{s.membroName}</p>
                  <p className="text-xs text-gray-400">{s.position} · {formatDate(s.serviceDate)}</p>
                </div>
              </div>
            ))}
          </div>
        </Link>
      )}

      {/* Última escala */}
      {latestSchedule && (
        <Link href="/app/schedules">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="font-bold text-gray-900 text-sm mb-2">Última Escala</p>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-gray-800">{latestSchedule.teamName}</p>
                <p className="text-xs text-gray-400">{latestSchedule.serviceTitle} · {formatDate(latestSchedule.serviceDate)}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{latestConfirmed}<span className="text-sm text-gray-300">/{latestTotal}</span></p>
                <p className="text-xs text-gray-400">confirmados</p>
              </div>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-400 rounded-full" style={{ width: latestTotal > 0 ? `${(latestConfirmed / latestTotal) * 100}%` : "0%" }} />
            </div>
          </div>
        </Link>
      )}

      {/* Último relatório */}
      {lastRelatorio && (
        <Link href="/app/historico">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="font-bold text-gray-900 text-sm mb-2">Último Relatório</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">{lastRelatorio.serviceTitle}</p>
                <p className="text-xs text-gray-400">{lastRelatorio.teamName} · {formatDate(lastRelatorio.serviceDate)}</p>
              </div>
              <span className={`text-sm font-bold ${AVALIACAO_COLORS[lastRelatorio.avaliacao]}`}>{lastRelatorio.avaliacao}</span>
            </div>
            <div className="flex gap-4 mt-2">
              <span className="text-xs text-green-600 font-semibold">✓ {lastRelatorio.presentes}</span>
              <span className="text-xs text-red-400">✗ {lastRelatorio.ausentes}</span>
              <span className="text-xs text-blue-400">⇄ {lastRelatorio.substitutos}</span>
            </div>
          </div>
        </Link>
      )}

      {/* Aniversariantes */}
      {aniversariantes.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="font-bold text-gray-900 text-sm mb-3">🎂 Aniversariantes de {MONTH_NAMES[currentMonth - 1]}</p>
          <div className="space-y-2">
            {aniversariantes.slice(0, 5).map((m) => {
              const md = getMonthDay(m.aniversario)!;
              const team = teams.find((t) => t.id === m.teamId);
              const isToday = md.day === now.getDate();
              const isWeek = md.day > now.getDate() && md.day <= now.getDate() + 7;
              return (
                <div key={m.id} className={`flex items-center gap-3 p-2 rounded-xl ${isToday ? "bg-pink-50" : ""}`}>
                  <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0 text-sm">🎂</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isToday ? "text-pink-700" : "text-gray-800"}`}>
                      {m.name} {isToday ? "🎉 Hoje!" : isWeek ? "🔜" : ""}
                    </p>
                    <p className="text-xs text-gray-400">{team?.name} · {md.day}/{MONTH_NAMES[currentMonth - 1]}</p>
                  </div>
                </div>
              );
            })}
            {aniversariantes.length > 5 && (
              <p className="text-xs text-gray-400 text-center pt-1">+{aniversariantes.length - 5} aniversariantes</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
