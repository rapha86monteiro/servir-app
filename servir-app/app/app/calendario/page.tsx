"use client";

import { useEffect, useState } from "react";
import { getServices } from "@/lib/firestore/services";
import type { Service, Turno } from "@/lib/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

const TURNOS: Turno[] = ["Manhã", "Tarde", "Noite"];

const TURNO_COLORS: Record<string, string> = {
  "Manhã": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "Tarde": "bg-orange-100 text-orange-800 border-orange-300",
  "Noite": "bg-blue-100 text-blue-800 border-blue-300",
  "Especial": "bg-purple-100 text-purple-800 border-purple-300",
};

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function formatDayLabel(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return { day: d.getDate(), weekDay: WEEK_DAYS[d.getDay()] };
}

export default function CalendarioPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setServices(await getServices());
    setLoading(false);
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const monthServices = services.filter((s) => {
    const d = new Date(s.date + "T12:00:00");
    return d.getMonth() === month && d.getFullYear() === year;
  });

  // Datas únicas do mês com cultos
  const uniqueDates = [...new Set(monthServices.map((s) => s.date))].sort();

  // Mapa: date -> turno -> service
  const grid: Record<string, Record<string, Service[]>> = {};
  monthServices.forEach((s) => {
    if (!grid[s.date]) grid[s.date] = {};
    if (!grid[s.date][s.turno]) grid[s.date][s.turno] = [];
    grid[s.date][s.turno].push(s);
  });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Calendário</h1>
          <p className="text-gray-500 text-sm">Grade de equipes por culto e turno</p>
        </div>
      </div>

      {/* Navegação de mês */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{MONTH_NAMES[month]}</p>
            <p className="text-sm text-gray-400">{year}</p>
          </div>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>

        {uniqueDates.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">Nenhum culto cadastrado neste mês.</p>
          </div>
        ) : (
          /* Tabela scroll horizontal no mobile */
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full min-w-max text-sm border-collapse">
              <thead>
                <tr>
                  <th className="bg-gray-900 text-white text-xs font-bold px-3 py-2 rounded-tl-lg w-16">
                    TURNO
                  </th>
                  {uniqueDates.map((date) => {
                    const { day, weekDay } = formatDayLabel(date);
                    return (
                      <th key={date} className="bg-gray-900 text-white text-xs font-semibold px-3 py-2 text-center min-w-28">
                        <p>{weekDay}</p>
                        <p className="text-gray-300">{String(day).padStart(2, "0")}/{String(month + 1).padStart(2, "0")}</p>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {TURNOS.map((turno) => (
                  <tr key={turno} className="border-b border-gray-100">
                    <td className="bg-gray-50 px-3 py-3 text-xs font-bold text-gray-600 text-center">
                      {turno.toUpperCase()}
                    </td>
                    {uniqueDates.map((date) => {
                      const svcs = grid[date]?.[turno] ?? [];
                      return (
                        <td key={date} className="px-2 py-2 text-center align-middle border-l border-gray-100">
                          {svcs.length === 0 ? (
                            <span className="text-gray-200 text-lg">+</span>
                          ) : (
                            <div className="space-y-1">
                              {svcs.map((s) => (
                                <div key={s.id} className="space-y-0.5">
                                  <span className={`inline-block px-2 py-1 rounded-lg text-xs font-bold border ${TURNO_COLORS[turno]}`}>
                                    {s.teamName.toUpperCase()}
                                  </span>
                                  {s.title !== "Culto de Domingo" && s.title !== "Culto de Quinta" && (
                                    <p className="text-xs text-gray-400">{s.title}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lista compacta mobile */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-700">Cultos do mês</p>
        {uniqueDates.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhum culto neste mês</p>
        ) : (
          uniqueDates.map((date) => {
            const { day, weekDay } = formatDayLabel(date);
            const daySvcs = monthServices.filter((s) => s.date === date);
            return (
              <div key={date} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-900 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                    <p className="text-white text-xs font-bold leading-none">{weekDay}</p>
                    <p className="text-white text-sm font-bold leading-none mt-0.5">{day}</p>
                  </div>
                  <div className="flex-1">
                    {daySvcs.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 mb-1 last:mb-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${TURNO_COLORS[s.turno]}`}>
                          {s.turno}
                        </span>
                        <span className="text-sm font-medium text-gray-800">{s.teamName}</span>
                        {s.horario && <span className="text-xs text-gray-400">{s.horario}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
