"use client";

import { useEffect, useState, useRef } from "react";
import { getServices, createService, updateService, deleteService } from "@/lib/firestore/services";
import { getTeams } from "@/lib/firestore/teams";
import { getMembers } from "@/lib/firestore/members";
import { getTeamColor } from "@/lib/teamColors";
import type { Service, Team, Member, Turno } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Plus, Pencil, Trash2, Share2, ChevronLeft, ChevronRight } from "lucide-react";

const TURNOS_ALL: Turno[] = ["Manhã", "Tarde", "Noite", "Especial"];
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

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }

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
    if (!form.date || !form.teamId) { alert("Selecione data e equipe."); return; }
    try {
      const team = teams.find((t) => t.id === form.teamId);
      const data = { ...form, teamName: team?.name ?? "", title: `Culto ${form.turno}` };
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

  async function shareWhatsApp() {
    if (!gridRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const source = gridRef.current;

      // Cria clone off-screen com largura fixa para evitar corte
      const clone = source.cloneNode(true) as HTMLElement;
      clone.style.position = "absolute";
      clone.style.left = "-99999px";
      clone.style.top = "0";
      clone.style.width = "1400px";
      clone.style.maxWidth = "none";
      clone.style.padding = "32px";
      clone.style.backgroundColor = "#ffffff";
      document.body.appendChild(clone);

      // Aguarda renderização
      await new Promise((r) => setTimeout(r, 200));

      const canvas = await html2canvas(clone, {
        backgroundColor: "#ffffff",
        scale: 3, // alta resolução
        useCORS: true,
        logging: false,
        width: clone.scrollWidth,
        height: clone.scrollHeight,
        windowWidth: clone.scrollWidth,
        windowHeight: clone.scrollHeight,
      });

      document.body.removeChild(clone);

      canvas.toBlob(async (blob) => {
        if (!blob) { setExporting(false); return; }
        const file = new File([blob], `calendario-${MONTH_NAMES[month]}-${year}.png`, { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `Calendário ${MONTH_NAMES[month]} ${year}`,
            });
          } catch {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = file.name; a.click();
          }
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = file.name; a.click();
        }
        setExporting(false);
      }, "image/png", 1.0);
    } catch (err) {
      alert("Erro: " + String(err));
      setExporting(false);
    }
  }

  const monthServices = services.filter((s) => {
    const d = new Date(s.date + "T12:00:00");
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const uniqueDates = [...new Set(monthServices.map((s) => s.date))].sort();

  // Turnos sempre os 3 principais (igual à imagem do usuário)
  const turnosFixos: Turno[] = ["Manhã", "Tarde", "Noite"];

  const aniversariantes = members
    .filter((m) => {
      if (!m.aniversario) return false;
      return parseInt(m.aniversario.split("-")[1]) === month + 1;
    })
    .sort((a, b) => parseInt(a.aniversario.split("-")[2]) - parseInt(b.aniversario.split("-")[2]));

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
            disabled={exporting || uniqueDates.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            <Share2 size={14} /> {exporting ? "Gerando..." : "Compartilhar"}
          </button>
          {isAdmin && (
            <Button onClick={() => openCreate()} size="sm"><Plus size={15} /> Culto</Button>
          )}
        </div>
      </div>

      {/* Navegação */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex items-center justify-between">
        <button onClick={prevMonth} className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
          <ChevronLeft size={14} className="inline" /> ant
        </button>
        <p className="font-bold text-gray-900">{MONTH_NAMES[month]} {year}</p>
        <button onClick={nextMonth} className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
          prox <ChevronRight size={14} className="inline" />
        </button>
      </div>

      {/* Grade + Aniversariantes (a parte exportada) */}
      <div ref={gridRef} className="bg-white p-6" style={{ minWidth: "fit-content" }}>
        {/* Header da imagem */}
        <div className="text-center pb-4 mb-4 border-b-2 border-gray-900">
          <p className="text-lg font-bold tracking-wide text-gray-900">BELÉM CHURCH · {MONTH_NAMES[month].toUpperCase()} {year}</p>
        </div>

        {uniqueDates.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">Nenhum culto cadastrado neste mês.</p>
        ) : (
          <table className="border-collapse text-xs" style={{ width: "100%", minWidth: `${120 + uniqueDates.length * 110}px` }}>
            <thead>
              <tr>
                <th className="bg-gray-900 text-white font-bold px-3 py-3 text-center" style={{ width: 100 }}>TURNO</th>
                {uniqueDates.map((date) => {
                  const d = new Date(date + "T12:00:00");
                  const dayLabel = WEEK_DAYS[d.getDay()];
                  const dayNum = String(d.getDate()).padStart(2, "0");
                  const monthNum = String(d.getMonth() + 1).padStart(2, "0");
                  return (
                    <th key={date} className="bg-gray-900 text-white font-bold px-2 py-3 text-center" style={{ minWidth: 110 }}>
                      <div className="text-xs tracking-wide">{dayLabel}</div>
                      <div className="text-sm font-bold mt-1">{dayNum}/{monthNum}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {turnosFixos.map((turno) => (
                <tr key={turno}>
                  <td className="bg-gray-50 px-3 py-4 font-bold text-gray-600 text-center text-xs border border-gray-200">
                    {turno.toUpperCase()}
                  </td>
                  {uniqueDates.map((date) => {
                    const svcs = monthServices.filter((s) => s.date === date && s.turno === turno);
                    return (
                      <td key={date} className="border border-gray-200 p-2 text-center align-middle" style={{ height: 70 }}>
                        {svcs.length === 0 ? (
                          <button
                            onClick={() => isAdmin && openCreate(date, turno)}
                            className="w-full h-full text-gray-200 text-2xl hover:text-gray-400"
                          >
                            +
                          </button>
                        ) : (
                          <div className="space-y-1">
                            {svcs.map((s) => {
                              const color = getTeamColor(s.teamName);
                              return (
                                <div key={s.id}>
                                  <button
                                    onClick={() => isAdmin && openEdit(s)}
                                    className="inline-block px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90"
                                    style={{ backgroundColor: color.bg, color: color.text }}
                                  >
                                    {s.teamName.toUpperCase()}
                                  </button>
                                  {s.observacao && (
                                    <p className="text-[10px] font-medium mt-1" style={{ color: color.bg }}>
                                      {s.observacao}
                                    </p>
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
        )}

        {/* Aniversariantes (parte da imagem) */}
        {aniversariantes.length > 0 && (
          <div className="mt-6 pt-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🎂</span>
                <p className="font-bold text-gray-900 text-sm tracking-wide">ANIVERSARIANTES DE {MONTH_NAMES[month].toUpperCase()}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                {aniversariantes.map((m) => {
                  const day = parseInt(m.aniversario.split("-")[2]);
                  const team = teams.find((t) => t.id === m.teamId);
                  const color = getTeamColor(team?.name ?? "");
                  return (
                    <div key={m.id} className="flex items-center gap-2 py-1 border-b border-amber-100/50 last:border-0">
                      <span className="text-pink-500 text-xs">📍</span>
                      <span className="text-xs font-bold text-gray-700 w-12">{String(day).padStart(2, "0")}/{String(month + 1).padStart(2, "0")}</span>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color.bg }} />
                      <span className="text-xs font-semibold text-gray-900 flex-1 truncate">{m.name}</span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide">{team?.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer da imagem */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">Calendário de Equipes · Belém Church Servir</p>
        </div>
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar Culto" : "Novo Culto"} size="sm">
        <div className="space-y-3">
          <Input label="Data" type="date" value={form.date} onChange={(e) => handleDateChange(e.target.value)} />
          <Select label="Turno" value={form.turno} onChange={(e) => handleTurnoChange(e.target.value as Turno)}>
            {getAvailableTurnos(form.date).map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select label="Equipe responsável" value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
            <option value="">Selecione</option>
            {[...teams].sort((a, b) => a.name.localeCompare(b.name)).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Horário culto" type="time" value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} />
            <Input label="Chegada equipe" type="time" value={form.horarioChegada} onChange={(e) => setForm({ ...form, horarioChegada: e.target.value })} />
          </div>
          <Textarea
            label="Observação"
            value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            placeholder="Ex: Santa Ceia, Batismo..."
            rows={2}
          />
          {editing && isAdmin && (
            <button onClick={() => { handleDelete(editing.id); setModalOpen(false); }} className="text-xs text-red-500 hover:underline">
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
