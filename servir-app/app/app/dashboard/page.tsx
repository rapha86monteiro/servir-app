"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { getServices } from "@/lib/firestore/services";
import { getTeams } from "@/lib/firestore/teams";
import { getMembers } from "@/lib/firestore/members";
import { getSchedules, updateSchedulePositions } from "@/lib/firestore/schedules";
import { getSubstituicoesAbertas } from "@/lib/firestore/substituicoes";
import { getAvisos, type Aviso } from "@/lib/firestore/avisos";
import { getVersiculoDoDia } from "@/lib/versiculos";
import type { Service, Team, Member, Substituicao, Schedule, PositionSlots } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Cake, ChevronRight, ChevronLeft, RefreshCw, Calendar, MessageSquare, Megaphone, Pin, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const WEEK_DAYS = ["DOM","SEG","TER","QUA","QUI","SEX","SÁB"];
const WEEK_DAYS_FULL = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];

const TURNO_COLORS: Record<string, string> = {
  "Manhã": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Tarde": "bg-orange-100 text-orange-700 border-orange-200",
  "Noite": "bg-blue-100 text-blue-700 border-blue-200",
  "Especial": "bg-purple-100 text-purple-700 border-purple-200",
};

function getMonthDayFromAniversario(dateStr: string) {
  if (!dateStr) return null;
  // Suporta tanto YYYY-MM-DD quanto outros formatos
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return { month: parseInt(parts[1]), day: parseInt(parts[2]) };
  }
  return null;
}

function getWeekStart(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getWeekDates(weekStart: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

function dateToISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DashboardPage() {
  const { appUser } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [substituicoes, setSubstituicoes] = useState<Substituicao[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const todayISO = dateToISO(now);

  const weekStart = getWeekStart(weekOffset);
  const weekDates = getWeekDates(weekStart);
  const weekEnd = weekDates[6];

  useEffect(() => {
    async function load() {
      if (!appUser) return;
      setLoading(true);
      try {
        const svcs = await getServices().catch(() => []);
        const allTeams = await getTeams().catch(() => []);
        const allMembers = await getMembers().catch(() => []);
        const subs = await getSubstituicoesAbertas().catch(() => []);
        const avs = await getAvisos().catch(() => []);
        const scheds = await getSchedules().catch(() => []);
        setServices(svcs);
        setTeams(allTeams);
        setMembers(allMembers);
        setSubstituicoes(subs);
        setAvisos(avs);
        setSchedules(scheds);
        const uid = auth.currentUser?.uid ?? appUser.uid;
        const meu = allMembers.find((m) => m.uid === uid);
        setMyMemberId(meu?.id ?? null);
      } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
      }
      setLoading(false);
    }
    load();
  }, [appUser]);

  // Cultos da semana visível
  const weekServices = services.filter((s) => {
    const sDate = new Date(s.date + "T12:00:00");
    sDate.setHours(0, 0, 0, 0);
    const start = new Date(weekStart);
    const end = new Date(weekEnd);
    end.setHours(23, 59, 59, 999);
    return sDate >= start && sDate <= end;
  });

  // Agrupar por dia
  const cultosByDay = weekDates.map((d) => {
    const iso = dateToISO(d);
    const dayServices = weekServices.filter((s) => s.date === iso);
    return { date: d, iso, services: dayServices };
  }).filter((d) => d.services.length > 0);

  // Aniversariantes do mês atual
  const aniversariantes = members
    .filter((m) => {
      if (!m.aniversario) return false;
      const md = getMonthDayFromAniversario(m.aniversario);
      return md?.month === currentMonth;
    })
    .sort((a, b) => {
      const da = getMonthDayFromAniversario(a.aniversario)?.day ?? 0;
      const db = getMonthDayFromAniversario(b.aniversario)?.day ?? 0;
      return da - db;
    });

  const todayBirthdays = aniversariantes.filter((m) =>
    getMonthDayFromAniversario(m.aniversario)?.day === now.getDate()
  );

  const weekLabel = weekOffset === 0
    ? "Esta semana"
    : weekOffset === 1
    ? "Próxima semana"
    : weekOffset === -1
    ? "Semana passada"
    : `${weekStart.getDate()}/${weekStart.getMonth() + 1} - ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`;

  // Escalas futuras aguardando MINHA confirmação
  const minhasPendentes: { schedule: Schedule; position: string }[] = [];
  if (myMemberId) {
    schedules.forEach((s) => {
      if (!s.positions || s.serviceDate < todayISO) return;
      Object.entries(s.positions).forEach(([position, slots]) => {
        slots.forEach((slot) => {
          if (slot.memberId === myMemberId && slot.confirmed === null) {
            minhasPendentes.push({ schedule: s, position });
          }
        });
      });
    });
  }

  async function confirmarMinha(schedule: Schedule, position: string, value: boolean) {
    if (!myMemberId) return;
    const positions: PositionSlots = { ...schedule.positions };
    positions[position] = (positions[position] ?? []).map((s) =>
      s.memberId === myMemberId ? { ...s, confirmed: value } : s
    );
    await updateSchedulePositions(schedule.id, positions);
    setSchedules((prev) => prev.map((s) => s.id === schedule.id ? { ...s, positions } : s));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-black" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Olá, {appUser?.name?.split(" ")[0]} 👋</h1>
        <p className="text-gray-400 text-sm">Departamento Servir · Belém Church</p>
      </div>

      {/* Devocional do dia */}
      {(() => {
        const v = getVersiculoDoDia();
        return (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-wide mb-2">📖 Palavra do dia</p>
            <p className="text-sm text-gray-700 italic leading-relaxed">"{v.texto}"</p>
            <p className="text-xs font-semibold text-indigo-500 mt-2">— {v.ref}</p>
          </div>
        );
      })()}

      {/* Confirmação pendente do voluntário */}
      {minhasPendentes.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4">
          <p className="font-bold text-amber-800 text-sm mb-1">⏳ Você tem {minhasPendentes.length} escala{minhasPendentes.length !== 1 ? "s" : ""} para confirmar</p>
          <p className="text-xs text-amber-600 mb-3">Confirme sua presença para o líder saber que pode contar com você.</p>
          <div className="space-y-2">
            {minhasPendentes.map(({ schedule, position }, idx) => (
              <div key={schedule.id + idx} className="bg-white rounded-xl p-3">
                <p className="text-sm font-semibold text-gray-900">{schedule.serviceTitle}</p>
                <p className="text-xs text-gray-400 mb-2">{formatDate(schedule.serviceDate)} · {schedule.serviceTurno} · 📍 {position}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => confirmarMinha(schedule, position, true)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600"
                  >
                    <CheckCircle2 size={15} /> Vou servir
                  </button>
                  <button
                    onClick={() => confirmarMinha(schedule, position, false)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-red-200 text-red-500 rounded-lg text-sm font-medium hover:bg-red-50"
                  >
                    <XCircle size={15} /> Não posso
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mural de avisos */}
      {avisos.length > 0 && (
        <div className="space-y-2">
          {avisos.filter((a) => a.fixado).slice(0, 3).map((a) => (
            <div key={a.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Pin size={14} className="text-amber-500" />
                <p className="font-bold text-amber-800 text-sm">{a.titulo}</p>
              </div>
              <p className="text-sm text-amber-700 whitespace-pre-wrap">{a.mensagem}</p>
              <p className="text-xs text-amber-500 mt-2">{a.autor}</p>
            </div>
          ))}
          {avisos.filter((a) => a.fixado).length === 0 && avisos[0] && (
            <Link href="/app/mural">
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 flex items-center gap-3">
                <Megaphone size={18} className="text-amber-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{avisos[0].titulo}</p>
                  <p className="text-xs text-gray-400 truncate">{avisos[0].mensagem}</p>
                </div>
                <ChevronRight size={15} className="text-gray-300 flex-shrink-0" />
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Alerta de aniversariantes do dia */}
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

        {/* Navegação semana */}
        <div className="flex items-center justify-between mb-4 bg-gray-50 rounded-xl p-1.5">
          <button onClick={() => setWeekOffset(weekOffset - 1)} className="p-1.5 hover:bg-white rounded-lg transition-colors">
            <ChevronLeft size={16} className="text-gray-600" />
          </button>
          <button onClick={() => setWeekOffset(0)} className="text-sm font-semibold text-gray-700 hover:bg-white rounded-lg px-3 py-1 transition-colors">
            {weekLabel}
          </button>
          <button onClick={() => setWeekOffset(weekOffset + 1)} className="p-1.5 hover:bg-white rounded-lg transition-colors">
            <ChevronRight size={16} className="text-gray-600" />
          </button>
        </div>

        {/* Grade dos 7 dias */}
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

        {/* Detalhes dos cultos */}
        {cultosByDay.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-6">Nenhum culto nesta semana</p>
        ) : (
          <div className="space-y-3">
            {cultosByDay.map(({ date, iso, services: daySvcs }) => {
              const isToday = iso === todayISO;
              const isPast = iso < todayISO;
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
                      <div key={s.id} className={isToday ? "text-white" : "text-gray-800"}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${TURNO_COLORS[s.turno] ?? "bg-gray-100 text-gray-600"}`}>
                              {s.turno}
                            </span>
                            <p className="text-sm font-semibold truncate">{s.teamName}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            {s.horario && <p className={`text-xs ${isToday ? "text-white/60" : "text-gray-400"}`}>Culto {s.horario}</p>}
                            {s.horarioChegada && <p className="text-xs font-bold text-red-400">Chegada {s.horarioChegada}</p>}
                          </div>
                        </div>
                        {s.observacao && (
                          <p className={`text-xs mt-1 flex items-start gap-1 ${isToday ? "text-white/70" : "text-gray-500"}`}>
                            <MessageSquare size={10} className="mt-0.5 flex-shrink-0" /> {s.observacao}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Substituições */}
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

      {/* Aniversariantes da semana */}
      {(() => {
        const weekBirthdays = members.filter((m) => {
          if (!m.aniversario) return false;
          const md = getMonthDayFromAniversario(m.aniversario);
          if (!md) return false;
          return weekDates.some((d) => d.getMonth() + 1 === md.month && d.getDate() === md.day);
        });
        if (weekBirthdays.length === 0) return null;
        return (
          <div className="bg-white rounded-2xl border border-pink-200 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Cake size={16} className="text-pink-400" />
              <p className="font-bold text-gray-900 text-sm">Aniversariantes da Semana</p>
              <span className="text-xs text-gray-400">({weekBirthdays.length})</span>
            </div>
            <div className="space-y-2">
              {weekBirthdays
                .sort((a, b) => {
                  const da = getMonthDayFromAniversario(a.aniversario)!.day;
                  const db = getMonthDayFromAniversario(b.aniversario)!.day;
                  return da - db;
                })
                .map((m) => {
                  const md = getMonthDayFromAniversario(m.aniversario)!;
                  const team = teams.find((t) => t.id === m.teamId);
                  const isToday = md.day === now.getDate() && md.month === currentMonth;
                  const matchingDate = weekDates.find((d) => d.getMonth() + 1 === md.month && d.getDate() === md.day);
                  return (
                    <div key={m.id} className={`flex items-center gap-3 p-2 rounded-xl ${isToday ? "bg-pink-100" : "bg-pink-50"}`}>
                      <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center text-xs font-bold flex-shrink-0 ${isToday ? "bg-pink-300 text-pink-800" : "bg-white text-pink-500"}`}>
                        <span className="text-[9px] uppercase leading-none">{matchingDate && WEEK_DAYS[matchingDate.getDay()]}</span>
                        <span className="text-sm leading-none mt-0.5">{md.day}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isToday ? "text-pink-800" : "text-gray-800"}`}>
                          {m.name} {isToday && "🎉 Hoje!"}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{team?.name}</p>
                      </div>
                      {m.phone && (
                        <button
                          onClick={() => {
                            const primeiroNome = m.name.split(" ")[0];
                            const msg = `🎉 Feliz aniversário, ${primeiroNome}! Que Deus abençoe muito a sua vida. Toda a equipe Servir da Belém Church te deseja um dia especial! 🎂🙏`;
                            window.open(`https://wa.me/55${m.phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
                          }}
                          className="flex-shrink-0 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors"
                        >
                          🎂 Parabenizar
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        );
      })()}

    </div>
  );
}
