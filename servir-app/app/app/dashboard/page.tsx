"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getServices } from "@/lib/firestore/services";
import { getSchedules, getSchedulesByTeam } from "@/lib/firestore/schedules";
import { getTeamsByLeader, getTeams } from "@/lib/firestore/teams";
import type { Service, Schedule, Team } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { CalendarDays, ClipboardList, Users, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { appUser } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    async function load() {
      const [svcs, teams] = await Promise.all([
        getServices(),
        appUser?.role === "admin" ? getTeams() : getTeamsByLeader(appUser!.uid),
      ]);
      setServices(svcs.slice(0, 5));
      setTeams(teams);

      let scheds: Schedule[];
      if (appUser?.role === "admin") {
        scheds = await getSchedules();
      } else {
        const all = await Promise.all(teams.map((t) => getSchedulesByTeam(t.id)));
        scheds = all.flat();
      }
      setSchedules(scheds);
    }
    if (appUser) load();
  }, [appUser]);

  const pendingConfirmations = schedules.reduce((acc, s) => {
    return acc + s.slots.filter((sl) => sl.confirmed === null).length;
  }, 0);

  const confirmedSlots = schedules.reduce((acc, s) => {
    return acc + s.slots.filter((sl) => sl.confirmed === true).length;
  }, 0);

  const stats = [
    { label: "Próximos Cultos", value: services.length, icon: CalendarDays, color: "bg-blue-500" },
    { label: "Escalas Criadas", value: schedules.length, icon: ClipboardList, color: "bg-purple-500" },
    { label: "Equipes", value: teams.length, icon: Users, color: "bg-emerald-500" },
    { label: "Confirmações Pendentes", value: pendingConfirmations, icon: CheckCircle2, color: "bg-amber-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Olá, {appUser?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1">Aqui está o resumo do departamento Servir</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center mb-3`}>
              <Icon size={20} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Próximos Cultos</h2>
            {appUser?.role === "admin" && (
              <Link href="/app/services" className="text-sm text-blue-600 hover:underline">Ver todos</Link>
            )}
          </div>
          {services.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhum culto cadastrado</p>
          ) : (
            <ul className="space-y-2">
              {services.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm font-medium text-gray-800">{s.title}</span>
                  <span className="text-xs text-gray-500">{formatDate(s.date)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Escalas Recentes</h2>
            <Link href="/app/schedules" className="text-sm text-blue-600 hover:underline">Ver todas</Link>
          </div>
          {schedules.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhuma escala criada</p>
          ) : (
            <ul className="space-y-2">
              {schedules.slice(0, 5).map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{s.teamName}</p>
                    <p className="text-xs text-gray-400">{s.serviceTitle}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {s.slots.filter((sl) => sl.confirmed).length}/{s.slots.length} ✓
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
