"use client";

import { useEffect, useState } from "react";
import { getSchedules, getSchedulesByTeam, createSchedule, deleteSchedule } from "@/lib/firestore/schedules";
import { getTeams, getTeamsByLeader } from "@/lib/firestore/teams";
import { getServices } from "@/lib/firestore/services";
import { getMembersByTeam } from "@/lib/firestore/members";
import type { Schedule, Team, Service, Member, ScheduleSlot } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Plus, Trash2, Eye, ClipboardList } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";

export default function SchedulesPage() {
  const { appUser } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);

  useEffect(() => { load(); }, [appUser]);

  async function load() {
    if (!appUser) return;
    setLoading(true);
    const [t, s] = await Promise.all([
      appUser.role === "admin" ? getTeams() : getTeamsByLeader(appUser.uid),
      getServices(),
    ]);
    setTeams(t);
    setServices(s);

    let scheds: Schedule[];
    if (appUser.role === "admin") {
      scheds = await getSchedules();
    } else {
      const all = await Promise.all(t.map((team) => getSchedulesByTeam(team.id)));
      scheds = all.flat();
    }
    setSchedules(scheds);
    setLoading(false);
  }

  async function handleTeamChange(teamId: string) {
    setSelectedTeam(teamId);
    if (teamId) {
      const m = await getMembersByTeam(teamId);
      setMembers(m);
      setSlots(m.map((mb) => ({ memberId: mb.id, memberName: mb.name, role: "", confirmed: null, justification: "" })));
    }
  }

  function updateSlotRole(memberId: string, role: string) {
    setSlots((prev) => prev.map((s) => s.memberId === memberId ? { ...s, role } : s));
  }

  function toggleSlot(memberId: string) {
    setSlots((prev) =>
      prev.map((s) =>
        s.memberId === memberId ? { ...s, role: s.role === "__removed" ? "" : "__removed" } : s
      )
    );
  }

  async function handleCreate() {
    if (!selectedTeam || !selectedService) return;
    const team = teams.find((t) => t.id === selectedTeam)!;
    const service = services.find((s) => s.id === selectedService)!;
    const activeSlots = slots.filter((s) => s.role !== "__removed");
    await createSchedule({
      serviceId: selectedService,
      serviceTitle: service.title,
      serviceDate: service.date,
      teamId: selectedTeam,
      teamName: team.name,
      leaderId: appUser!.uid,
      slots: activeSlots,
      publicToken: uuidv4(),
      createdAt: new Date().toISOString(),
    });
    setModalOpen(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta escala?")) return;
    await deleteSchedule(id);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Escalas</h1>
          <p className="text-gray-500 text-sm mt-1">{schedules.length} escalas criadas</p>
        </div>
        <Button onClick={() => { setSelectedTeam(""); setSelectedService(""); setSlots([]); setModalOpen(true); }}>
          <Plus size={16} /> Nova Escala
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => {
            const confirmed = s.slots.filter((sl) => sl.confirmed === true).length;
            const pending = s.slots.filter((sl) => sl.confirmed === null).length;
            return (
              <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                      <ClipboardList size={22} className="text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{s.teamName}</p>
                      <p className="text-sm text-gray-400">{s.serviceTitle} · {formatDate(s.serviceDate)}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="green">{confirmed} confirmados</Badge>
                        {pending > 0 && <Badge variant="yellow">{pending} pendentes</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/app/schedules/${s.id}`}>
                      <Button variant="secondary" size="sm"><Eye size={14} /> Ver</Button>
                    </Link>
                    <button onClick={() => handleDelete(s.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {schedules.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-12">Nenhuma escala criada ainda.</p>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Escala" size="lg">
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Select label="Equipe" value={selectedTeam} onChange={(e) => handleTeamChange(e.target.value)}>
              <option value="">Selecione a equipe</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
            <Select label="Culto" value={selectedService} onChange={(e) => setSelectedService(e.target.value)}>
              <option value="">Selecione o culto</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.title} — {formatDate(s.date)}</option>)}
            </Select>
          </div>

          {slots.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Membros escalados</p>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {slots.map((slot) => (
                  <div key={slot.memberId} className={`flex items-center gap-3 p-2 rounded-lg border ${slot.role === "__removed" ? "opacity-40 bg-gray-50" : "bg-white border-gray-200"}`}>
                    <input
                      type="checkbox"
                      checked={slot.role !== "__removed"}
                      onChange={() => toggleSlot(slot.memberId)}
                      className="accent-blue-600"
                    />
                    <span className="flex-1 text-sm font-medium text-gray-800">{slot.memberName}</span>
                    <input
                      type="text"
                      placeholder="Função (opcional)"
                      value={slot.role === "__removed" ? "" : slot.role}
                      disabled={slot.role === "__removed"}
                      onChange={(e) => updateSlotRole(slot.memberId, e.target.value)}
                      className="text-sm border border-gray-200 rounded px-2 py-1 w-36 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!selectedTeam || !selectedService}>Criar Escala</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
