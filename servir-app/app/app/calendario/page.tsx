"use client";

import { useEffect, useState, useRef } from "react";
import { getServices, createService, updateService, deleteService } from "@/lib/firestore/services";
import { getTeams } from "@/lib/firestore/teams";
import { getMembers } from "@/lib/firestore/members";
import type { Service, Team, Member, Turno } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Share2, Download } from "lucide-react";

const TURNOS_ALL: Turno[] = ["Manhã", "Tarde", "Noite", "Especial"];

// Cores para cada equipe (rotativas)
const TEAM_COLORS = [
  { bg: "bg-emerald-500", text: "text-white" },
  { bg: "bg-blue-500", text: "text-white" },
  { bg: "bg-orange-500", text: "text-white" },
  { bg: "bg-purple-500", text: "text-white" },
  { bg: "bg-red-500", text: "text-white" },
  { bg: "bg-yellow-500", text: "text-white" },
  { bg: "bg-pink-500", text: "text-white" },
  { bg: "bg-teal-500", text: "text-white" },
  { bg: "bg-indigo-500", text: "text-white" },
  { bg: "bg-cyan-500", text: "text-white" },
  { bg: "bg-rose-500", text: "text-white" },
  { bg: "bg-amber-700", text: "text-white" },
];

const WEEK_DAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function getDefaultHorarios(dateStr: string, turno: Turno): { horario: string; horarioChegada: string } {
  if (!dateStr) return { horario: "", horarioChegada: "" };
  const day = new Date(dateStr + "T12:00:00").getDay();
  if (day === 0) {
    if (turno === "Manhã") return { horario: "10:00", horarioChegada: "09:00" };
    if (turno === "Tarde") return { horario: "17:00", horarioChegada: "16:00" };
    if (turno === "Noite") return { horario: "19:30", horarioChegada: "18:30" };
  }
  if (day === 4) return { horario: "20:00", horarioChegada: "19:00" };
  return { horario: "", horarioChegada: "" };
}

function getDefaultTurno(dateStr: string): Turno {
  if (!dateStr) return "Manhã";
  return new Date(dateStr + "T12:00:00").getDay() === 0 ? "Manhã" : "Noite";
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
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(empty);
  const [exporting, setExporting] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const isAdmin = appUser?.role === "admin" || appUser?.funcao === "Coordenador";

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [svcs, t, m] = await Promise.all([
      getServices().catch(() => []),
      getTeams().catch(() => []),
      getMembers().catch(() => []),
    ]);
    setServices(svcs);
    setTeams(t);
    setMembers(m);
    setLoading(false);
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1);
  }
  function goToday() {
    setMonth(now.getMonth());
    setYear(now.getFullYear());
  }

  function openCreate(presetDate?: string, presetTurno?: Turno) {
    setEditing(null);
    const date = presetDate ?? "";
    const turno = presetTurno ?? getDefaultTurno(date);
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
        title: `Culto ${form.turno}`,
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

  async function exportImage() {
    if (!gridRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(gridRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `calendario-${MONTH_NAMES[month]}-${year}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    } catch (err) {
      alert("Erro ao exportar: " + String(err));
    }
    setExporting(false);
  }

  async function shareWhatsApp() {
    if (!gridRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(gridRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `calendario-${MONTH_NAMES[month]}.png`, { type: "image/png" });

        // Tenta usar Web Share API (mobile)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `Calendário ${MONTH_NAMES[month]} ${year}`,
              text: `Calendário do Departamento Servir - ${MONTH_NAMES[month]} ${year}`,
            });
          } catch (err) {
            // Fallback: baixar
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `calendario-${MONTH_NAMES[month]}-${year}.png`;
            a.click();
          }
        } else {
          // Desktop: baixa e abre WhatsApp Web
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `calendario-${MONTH_NAMES[month]}-${year}.png`;
          a.click();
          setTimeout(() => {
            window.open(`https://web.whatsapp.com`, "_blank");
            alert("Imagem baixada! Cole no WhatsApp para compartilhar.");
          }, 500);
        }
      }, "image/png");
    } catch (err) {
      alert("Erro: " + String(err));
    }
    setExporting(false);
  }

  const monthServices = services.filter((s) => {
    const d = new Date(s.date + "T12:00:00");
    return d.getMonth() === month && d.getFullYear() === year;
  });

  // Datas únicas do mês com cultos
  const uniqueDates = [...new Set(monthServices.map((s) => s.date))].sort();

  // Cor por equipe
  function getTeamColor(teamName: string) {
    const idx = teams.findIndex((t) => t.name === teamName);
    return idx >= 0 ? TEAM_COLORS[idx % TEAM_COLORS.length] : { bg: "bg-gray-400", text: "text-white" };
  }

  // Turnos que aparecem na grade (somente os usados no mês)
  const turnosUsados: Turno[] = ["Manhã", "Tarde", "Noite"].filter((t) =>
    monthServices.some((s) => s.turno === t)
  ) as Turno[];
  if (turnosUsados.length === 0) turnosUsados.push("Manhã", "Tarde", "Noite");

  // Aniversariantes do mês
  const aniversariantes = members
    .filter((m) => {
      if (!m.aniversario) return false;
      const parts = m.aniversario.split("-");
      return parseInt(parts[1]) === month + 1;
    })
    .sort((a, b) => {
      const da = parseInt(a.aniversario.split("-")[2]);
      const db = parseInt(b.aniversario.split("-")[2]);
      return da - db;
    });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-black" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Calendário</h1>
          <p className="text-gray-500 text-sm">Grade de equipes por culto e turno</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={shareWhatsApp}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            <Share2 size={14} /> {exporting ? "..." : "Compartilhar"}
          </button>
          {isAdmin && (
            <Button onClick={() => openCreate()} size="sm"><Plus size={15} /> Culto</Button>
          )}
        </div>
      </div>

      {/* Navegação de mês */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex items-center justify-between">
        <button onClick={prevMonth} className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
          prev
        </button>
        <button onClick={goToday} className="font-bold text-gray-900">
          {MONTH_NAMES[month]} {year}
        </button>
        <button onClick={nextMonth} className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
          prox
        </button>
      </div>

      {/* Grade tipo planilha — esta é a parte exportada */}
      <div ref={gridRef} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
        <div className="mb-3">
          <p className="font-bold text-gray-900">Calendário</p>
          <p className="text-xs text-gray-400">Grade de equipes por culto e turno · {MONTH_NAMES[month]} {year}</p>
        </div>

        {uniqueDates.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">Nenhum culto cadastrado neste mês.</p>
            {isAdmin && (
              <button onClick={() => openCreate()} className="text-sm text-blue-600 hover:underline mt-2">
                + Cadastrar primeiro culto
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max border-collapse text-xs">
              <thead>
                <tr>
                  <th className="bg-black text-white font-bold px-3 py-2 rounded-tl-lg text-left">TURNO</th>
                  {uniqueDates.map((date, i) => {
                    const d = new Date(date + "T12:00:00");
                    const dayLabel = WEEK_DAYS[d.getDay()];
                    const dayNum = String(d.getDate()).padStart(2, "0");
                    const monthNum = String(d.getMonth() + 1).padStart(2, "0");
                    const isLast = i === uniqueDates.length - 1;
                    return (
                      <th key={date} className={`bg-black text-white font-bold px-3 py-2 text-center min-w-24 ${isLast ? "rounded-tr-lg" : ""}`}>
                        <div className="text-[10px] tracking-wide">{dayLabel}</div>
                        <div className="text-xs text-gray-300">{dayNum}/{monthNum}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {turnosUsados.map((turno) => (
                  <tr key={turno}>
                    <td className="bg-gray-50 px-3 py-3 font-bold text-gray-600 text-center text-[11px]">
                      {turno.toUpperCase()}
                    </td>
                    {uniqueDates.map((date) => {
                      const svcs = monthServices.filter((s) => s.date === date && s.turno === turno);
                      return (
                        <td key={date} className="border border-gray-100 p-2 text-center align-middle">
                          {svcs.length === 0 ? (
                            <button
                              onClick={() => isAdmin && openCreate(date, turno)}
                              className="w-full h-full text-gray-200 text-xl hover:text-gray-400 transition-colors"
                            >
                              +
                            </button>
                          ) : (
                            <div className="space-y-1">
                              {svcs.map((s) => {
                                const color = getTeamColor(s.teamName);
                                return (
                                  <div key={s.id} className="space-y-0.5">
                                    <button
                                      onClick={() => isAdmin && openEdit(s)}
                                      className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold ${color.bg} ${color.text} hover:opacity-90 transition-opacity`}
                                    >
                                      {s.teamName.toUpperCase()}
                                    </button>
                                    {s.observacao && (
                                      <p className="text-[9px] text-gray-500 leading-tight">{s.observacao}</p>
                                    )}
                                  </div>
                                );
                              })}
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

        {/* Aniversariantes dentro do bloco exportado */}
        {aniversariantes.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🎂</span>
              <p className="font-bold text-gray-900 text-sm">Aniversariantes do Mês</p>
            </div>
            <p className="text-xs text-gray-400 mb-3">Em ordem crescente de data</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {aniversariantes.map((m) => {
                const day = parseInt(m.aniversario.split("-")[2]);
                const team = teams.find((t) => t.id === m.teamId);
                const color = getTeamColor(team?.name ?? "");
                return (
                  <div key={m.id} className="flex items-center gap-2 py-1">
                    <span className="text-pink-500">📍</span>
                    <span className="text-xs font-bold text-gray-700 w-10">{String(day).padStart(2, "0")}/{String(month + 1).padStart(2, "0")}</span>
                    <span className={`w-2 h-2 rounded-full ${color.bg}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{m.name}</p>
                      <p className="text-[10px] text-gray-400 uppercase">{team?.name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
            label="Observação (aparece no card)"
            value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            placeholder="Ex: Santa Ceia, Batismo..."
            rows={2}
          />
          {editing && isAdmin && (
            <button
              onClick={() => { handleDelete(editing.id); setModalOpen(false); }}
              className="text-xs text-red-500 hover:underline"
            >
              <Trash2 size={11} className="inline" /> Excluir este culto
            </button>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
