"use client";

import { useEffect, useState } from "react";
import { getServices, createService, updateService, deleteService } from "@/lib/firestore/services";
import { getTeams } from "@/lib/firestore/teams";
import type { Service, Team, Turno } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, CalendarDays, MessageSquare } from "lucide-react";

const TURNOS_ALL: Turno[] = ["Manhã", "Tarde", "Noite", "Especial"];

const TURNO_COLORS: Record<string, string> = {
  "Manhã": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "Tarde": "bg-orange-100 text-orange-800 border-orange-300",
  "Noite": "bg-blue-100 text-blue-800 border-blue-300",
  "Especial": "bg-purple-100 text-purple-800 border-purple-300",
};

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

// Presets de horário
function getDefaultHorarios(dateStr: string, turno: Turno): { horario: string; horarioChegada: string } {
  if (!dateStr) return { horario: "", horarioChegada: "" };
  const date = new Date(dateStr + "T12:00:00");
  const day = date.getDay(); // 0=Dom, 4=Qui

  if (day === 0) { // Domingo
    if (turno === "Manhã") return { horario: "10:00", horarioChegada: "09:00" };
    if (turno === "Tarde") return { horario: "17:00", horarioChegada: "16:00" };
    if (turno === "Noite") return { horario: "19:30", horarioChegada: "18:30" };
  }
  if (day === 4) { // Quinta
    return { horario: "20:00", horarioChegada: "19:00" };
  }
  return { horario: "", horarioChegada: "" };
}

function getDefaultTurno(dateStr: string): Turno {
  if (!dateStr) return "Manhã";
  const day = new Date(dateStr + "T12:00:00").getDay();
  if (day === 0) return "Manhã";
  return "Noite";
}

function getAvailableTurnos(dateStr: string): Turno[] {
  if (!dateStr) return TURNOS_ALL;
  const day = new Date(dateStr + "T12:00:00").getDay();
  if (day === 0) return ["Manhã", "Tarde", "Noite"];
  return ["Noite", "Especial"];
}

const empty = { date: "", turno: "Manhã" as Turno, teamId: "", teamName: "", horario: "", horarioChegada: "", observacao: "" };

export default function CalendarioPage() {
  const { appUser } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(empty);

  const isAdmin = appUser?.role === "admin" || appUser?.funcao === "Coordenador";

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [svcs, t] = await Promise.all([getServices(), getTeams()]);
    setServices(svcs);
    setTeams(t);
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

  function goToday() {
    setMonth(now.getMonth());
    setYear(now.getFullYear());
  }

  function openCreate(presetDate?: string) {
    setEditing(null);
    const date = presetDate ?? "";
    const turno = getDefaultTurno(date);
    const { horario, horarioChegada } = getDefaultHorarios(date, turno);
    setForm({ ...empty, date, turno, horario, horarioChegada });
    setModalOpen(true);
  }

  function openEdit(s: Service) {
    setEditing(s);
    setForm({
      date: s.date, turno: s.turno, teamId: s.teamId, teamName: s.teamName,
      horario: s.horario ?? "", horarioChegada: s.horarioChegada ?? "",
      observacao: s.observacao ?? "",
    });
    setModalOpen(true);
  }

  function handleDateChange(date: string) {
    const turno = getDefaultTurno(date);
    const { horario, horarioChegada } = getDefaultHorarios(date, turno);
    setForm({ ...form, date, turno, horario, horarioChegada });
  }

  function handleTurnoChange(turno: Turno) {
    const { horario, horarioChegada } = getDefaultHorarios(form.date, turno);
    setForm({ ...form, turno, horario: horario || form.horario, horarioChegada: horarioChegada || form.horarioChegada });
  }

  async function handleSave() {
    if (!form.date || !form.teamId) {
      alert("Selecione a data e a equipe.");
      return;
    }
    try {
      const team = teams.find((t) => t.id === form.teamId);
      const data = {
        ...form,
        teamName: team?.name ?? "",
        title: `Culto ${form.turno === "Manhã" ? "Domingo Manhã" : form.turno === "Tarde" ? "Domingo Tarde" : form.turno === "Noite" ? (new Date(form.date + "T12:00:00").getDay() === 0 ? "Domingo Noite" : "de Quinta") : "Especial"}`,
      };
      if (editing) await updateService(editing.id, data);
      else await createService({ ...data, createdBy: appUser?.uid ?? "admin" });
      setModalOpen(false);
      load();
    } catch (err) {
      alert("Erro: " + String(err));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este culto?")) return;
    await deleteService(id);
    load();
  }

  const monthServices = services.filter((s) => {
    const d = new Date(s.date + "T12:00:00");
    return d.getMonth() === month && d.getFullYear() === year;
  });

  // Dias do mês com cultos
  const datesWithServices = [...new Set(monthServices.map((s) => s.date))].sort();

  // Construir calendário mensal completo
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) calendarDays.push(null);
  for (let d = 1; d <= totalDays; d++) calendarDays.push(d);

  const todayISO = now.toISOString().split("T")[0];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-black" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Calendário</h1>
          <p className="text-gray-500 text-sm">Cultos e escalas por mês</p>
        </div>
        {isAdmin && (
          <Button onClick={() => openCreate()} size="sm"><Plus size={15} /> Culto</Button>
        )}
      </div>

      {/* Navegação de mês */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <button onClick={goToday} className="text-center hover:bg-gray-50 rounded-lg px-3 py-1 transition-colors">
            <p className="text-lg font-bold text-gray-900">{MONTH_NAMES[month]}</p>
            <p className="text-sm text-gray-400">{year}</p>
          </button>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Grade do mês */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEK_DAYS.map((d) => (
            <p key={d} className="text-[10px] font-semibold text-gray-400 text-center uppercase">{d}</p>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((d, i) => {
            if (d === null) return <div key={i} />;
            const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const daySvcs = monthServices.filter((s) => s.date === iso);
            const isToday = iso === todayISO;
            const hasSvcs = daySvcs.length > 0;
            return (
              <button
                key={i}
                onClick={() => isAdmin && openCreate(iso)}
                className={`aspect-square rounded-lg text-xs flex flex-col items-center justify-center p-0.5 transition-colors ${
                  isToday ? "bg-black text-white" :
                  hasSvcs ? "bg-blue-50 hover:bg-blue-100" :
                  "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <span className={`font-bold ${isToday ? "text-white" : ""}`}>{d}</span>
                {hasSvcs && (
                  <div className="flex gap-0.5 mt-0.5">
                    {daySvcs.slice(0, 3).map((s) => (
                      <span key={s.id} className={`w-1 h-1 rounded-full ${
                        s.turno === "Manhã" ? "bg-yellow-400" :
                        s.turno === "Tarde" ? "bg-orange-400" :
                        s.turno === "Noite" ? "bg-blue-400" : "bg-purple-400"
                      }`} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de cultos do mês */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-700">Cultos de {MONTH_NAMES[month]}</p>
        {datesWithServices.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <CalendarDays size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhum culto neste mês</p>
            {isAdmin && (
              <button onClick={() => openCreate()} className="text-sm text-blue-600 hover:underline mt-2">
                + Cadastrar primeiro culto
              </button>
            )}
          </div>
        ) : (
          datesWithServices.map((date) => {
            const d = new Date(date + "T12:00:00");
            const daySvcs = monthServices.filter((s) => s.date === date);
            const isToday = date === todayISO;
            return (
              <div key={date} className={`bg-white rounded-2xl border shadow-sm p-3 ${isToday ? "border-gray-900" : "border-gray-100"}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${isToday ? "bg-black" : "bg-gray-900"}`}>
                    <p className="text-white text-xs font-bold leading-none">{WEEK_DAYS[d.getDay()].toUpperCase()}</p>
                    <p className="text-white text-base font-bold leading-none mt-0.5">{d.getDate()}</p>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {daySvcs.map((s) => (
                      <div key={s.id} className="group">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${TURNO_COLORS[s.turno]}`}>
                              {s.turno}
                            </span>
                            <span className="text-sm font-semibold text-gray-800 truncate">{s.teamName}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {s.horario && <span className="text-xs text-gray-400">{s.horario}</span>}
                            {isAdmin && (
                              <>
                                <button onClick={() => openEdit(s)} className="p-1 text-gray-300 hover:text-blue-500 transition-colors">
                                  <Pencil size={12} />
                                </button>
                                <button onClick={() => handleDelete(s.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {s.horarioChegada && (
                          <p className="text-xs text-red-500 font-medium mt-0.5">⏰ Chegada {s.horarioChegada}</p>
                        )}
                        {s.observacao && (
                          <p className="text-xs text-gray-500 mt-0.5 flex items-start gap-1">
                            <MessageSquare size={10} className="mt-0.5 flex-shrink-0" /> {s.observacao}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar Culto" : "Novo Culto"} size="sm">
        <div className="space-y-3">
          <Input label="Data" type="date" value={form.date} onChange={(e) => handleDateChange(e.target.value)} />
          <Select label="Turno" value={form.turno} onChange={(e) => handleTurnoChange(e.target.value as Turno)}>
            {getAvailableTurnos(form.date).map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select label="Equipe responsável" value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
            <option value="">Selecione a equipe</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Horário culto" type="time" value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} />
            <Input label="Chegada equipe" type="time" value={form.horarioChegada} onChange={(e) => setForm({ ...form, horarioChegada: e.target.value })} />
          </div>
          <Textarea
            label="Observação (opcional)"
            value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            placeholder="Ex: Santa Ceia, Batismo, Culto Especial..."
            rows={2}
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
