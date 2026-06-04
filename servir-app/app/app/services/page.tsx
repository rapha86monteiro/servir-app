"use client";

import { useEffect, useState } from "react";
import { getServices, createService, updateService, deleteService } from "@/lib/firestore/services";
import { getTeams } from "@/lib/firestore/teams";
import type { Service, Team, Turno } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, CalendarDays } from "lucide-react";
import { formatDate } from "@/lib/utils";

const TURNOS: Turno[] = ["Manhã", "Tarde", "Noite", "Especial"];
const TURNO_COLORS: Record<Turno, string> = {
  "Manhã": "bg-yellow-100 text-yellow-700",
  "Tarde": "bg-orange-100 text-orange-700",
  "Noite": "bg-blue-100 text-blue-700",
  "Especial": "bg-purple-100 text-purple-700",
};

const empty = { title: "Culto de Domingo", date: "", turno: "Manhã" as Turno, teamId: "", teamName: "", horario: "", horarioChegada: "" };

export default function ServicesPage() {
  const { appUser } = useAuth();
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (appUser && appUser.role !== "admin") router.push("/app/dashboard");
    load();
  }, [appUser]);

  async function load() {
    setLoading(true);
    const [svcs, t] = await Promise.all([getServices(), getTeams()]);
    setServices(svcs);
    setTeams(t);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setModalOpen(true);
  }

  function openEdit(s: Service) {
    setEditing(s);
    setForm({ title: s.title, date: s.date, turno: s.turno, teamId: s.teamId, teamName: s.teamName, horario: s.horario ?? "", horarioChegada: s.horarioChegada ?? "" });
    setModalOpen(true);
  }

  async function handleSave() {
    try {
      const team = teams.find((t) => t.id === form.teamId);
      const data = { ...form, teamName: team?.name ?? "" };
      if (editing) {
        await updateService(editing.id, data);
      } else {
        await createService({ ...data, createdBy: appUser!.uid });
      }
      setModalOpen(false);
      load();
    } catch (err) {
      alert("Erro ao salvar: " + String(err));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este culto?")) return;
    await deleteService(id);
    load();
  }

  const grouped = services.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {} as Record<string, Service[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cultos</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie os cultos e eventos</p>
        </div>
        <Button onClick={openCreate}><Plus size={16} /> Novo Culto</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([date, svcs]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{formatDate(date)}</p>
              <div className="space-y-2">
                {svcs.map((s) => (
                  <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                        <CalendarDays size={22} className="text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{s.title}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TURNO_COLORS[s.turno]}`}>{s.turno}</span>
                        </div>
                        <p className="text-sm text-gray-400">
                          {s.teamName}
                          {s.horario && ` · ${s.horario}`}
                          {s.horarioChegada && ` · Chegada: `}
                          {s.horarioChegada && <span className="text-red-500 font-medium">{s.horarioChegada}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {services.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-12">Nenhum culto cadastrado ainda.</p>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar Culto" : "Novo Culto"} size="md">
        <div className="space-y-4">
          <Input label="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Culto de Domingo" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Data" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Select label="Turno" value={form.turno} onChange={(e) => setForm({ ...form, turno: e.target.value as Turno })}>
              {TURNOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
          <Select label="Equipe responsável" value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
            <option value="">Selecione a equipe</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Horário do culto" type="time" value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} />
            <Input label="Chegada da equipe" type="time" value={form.horarioChegada} onChange={(e) => setForm({ ...form, horarioChegada: e.target.value })} />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
