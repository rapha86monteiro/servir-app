"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getServices } from "@/lib/firestore/services";
import { getSchedules, getSchedulesByTeam } from "@/lib/firestore/schedules";
import { getTeamsByLeader, getTeams } from "@/lib/firestore/teams";
import { getMembers } from "@/lib/firestore/members";
import type { Service, Schedule, Team, Member } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { CalendarDays, ClipboardList, Users, CheckCircle2, Cake } from "lucide-react";
import Link from "next/link";

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function getMonthDay(dateStr: string) {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  return { month: parseInt(parts[1]), day: parseInt(parts[2]) };
}

export default function DashboardPage() {
  const { appUser } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  useEffect(() => {
    async function load() {
      const [svcs, allTeams, allMembers] = await Promise.all([
        getServices(),
        appUser?.role === "admin" ? getTeams() : getTeamsByLeader(appUser!.uid),
        getMembers(),
      ]);
      setServices(svcs.slice(0, 5));
      setTeams(allTeams);
      setMembers(allMembers);

      let scheds: Schedule[];
      if (appUser?.role === "admin") {
        scheds = await getSchedules();
      } else {
        const all = await Promise.all(allTeams.map((t) => getSchedulesByTeam(t.id)));
        scheds = all.flat();
      }
      setSchedules(scheds);
    }
    if (appUser) load();
  }, [appUser]);

  const pendingConfirmations = schedules.reduce((acc, s) => {
    if (!s.positions) return acc;
    return acc + Object.values(s.positions).flat().filter((sl) => sl.confirmed === null).length;
  }, 0);

  // Aniversariantes do mês
  const aniversariantes = members
    .filter((m) => {
      if (!m.aniversario) return false;
      const md = getMonthDay(m.aniversario);
      return md?.month === currentMonth;
    })
    .sort((a, b) => {
      const da = getMonthDay(a.aniversario)?.day ?? 0;
      const db = getMonthDay(b.aniversario)?.day ?? 0;
      return da - db;
    });

  const stats = [
    { label: "Próximos Cultos", value: services.length, icon: CalendarDays, color: "bg-blue-500" },
    { label: "Escalas Criadas", value: schedules.length, icon: ClipboardList, color: "bg-purple-500" },
    { label: "Equipes", value: teams.length, icon: Users, color: "bg-emerald-500" },
    { label: "Confirmações Pendentes", value: pendingConfirmations, icon: CheckCircle2, color: "bg-amber-500" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Olá, {appUser?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1 text-sm">Resumo do departamento Servir</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center mb-3`}>
              <Icon size={20} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Aniversariantes do mês */}
      {aniversariantes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Cake size={18} className="text-pink-500" />
            <h2 className="font-semibold text-gray-900">🎂 Aniversariantes de {MONTH_NAMES[currentMonth - 1]}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {aniversariantes.map((m) => {
              const md = getMonthDay(m.aniversario)!;
              const team = teams.find((t) => t.id === m.teamId);
              const isToday = md.day === now.getDate();
              return (
                <div key={m.id} className={`flex items-center gap-3 p-2 rounded-lg ${isToday ? "bg-pink-50" : ""}`}>
                  <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">🎂</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isToday ? "text-pink-700" : "text-gray-800"}`}>
                      {m.name} {isToday ? "🎉" : ""}
                    </p>
                    <p className="text-xs text-gray-400">{team?.name} · {md.day}/{MONTH_NAMES[currentMonth - 1]}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 text-sm">Próximos Cultos</h2>
            {appUser?.role === "admin" && (
              <Link href="/app/services" className="text-xs text-blue-600 hover:underline">Ver todos</Link>
            )}
          </div>
          {services.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhum culto cadastrado</p>
          ) : (
            <ul className="space-y-2">
              {services.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{s.title}</p>
                    <p className="text-xs text-gray-400">{s.teamName}</p>
                  </div>
                  <span className="text-xs text-gray-500">{formatDate(s.date)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 text-sm">Escalas Recentes</h2>
            <Link href="/app/schedules" className="text-xs text-blue-600 hover:underline">Ver todas</Link>
          </div>
          {schedules.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhuma escala criada</p>
          ) : (
            <ul className="space-y-2">
              {schedules.slice(0, 5).map((s) => {
                const total = s.positions ? Object.values(s.positions).flat().length : 0;
                const confirmed = s.positions ? Object.values(s.positions).flat().filter((sl) => sl.confirmed).length : 0;
                return (
                  <li key={s.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{s.teamName}</p>
                      <p className="text-xs text-gray-400">{s.serviceTitle}</p>
                    </div>
                    <span className="text-xs text-gray-500">{confirmed}/{total} ✓</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
