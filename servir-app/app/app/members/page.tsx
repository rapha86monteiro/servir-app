"use client";

import { useEffect, useState } from "react";
import { getMembers, getMembersByTeam, createMember, updateMember, deleteMember } from "@/lib/firestore/members";
import { getTeams, getTeamsByLeader } from "@/lib/firestore/teams";
import type { Member, Team } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Pencil, Trash2, Phone, Search } from "lucide-react";

const empty = { name: "", phone: "", teamId: "", active: true };

export default function MembersPage() {
  const { appUser } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState(empty);

  useEffect(() => { load(); }, [appUser]);

  async function load() {
    if (!appUser) return;
    setLoading(true);
    const [t, m] = await Promise.all([
      appUser.role === "admin" ? getTeams() : getTeamsByLeader(appUser.uid),
      appUser.role === "admin" ? getMembers() : Promise.all(
        appUser.teamIds.map((tid) => getMembersByTeam(tid))
      ).then((r) => r.flat()),
    ]);
    setTeams(t);
    setMembers(m);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...empty, teamId: teams[0]?.id ?? "" });
    setModalOpen(true);
  }

  function openEdit(m: Member) {
    setEditing(m);
    setForm({ name: m.name, phone: m.phone, teamId: m.teamId, active: m.active });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.teamId) return;
    if (editing) {
      await updateMember(editing.id, form);
    } else {
      await createMember(form);
    }
    setModalOpen(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir membro?")) return;
    await deleteMember(id);
    load();
  }

  async function toggleActive(m: Member) {
    await updateMember(m.id, { active: !m.active });
    load();
  }

  const filtered = members.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchTeam = !filterTeam || m.teamId === filterTeam;
    return matchSearch && matchTeam;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Membros</h1>
          <p className="text-gray-500 text-sm mt-1">{members.length} membros cadastrados</p>
        </div>
        <Button onClick={openCreate}><Plus size={16} /> Novo Membro</Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar membro..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Todas as equipes</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Equipe</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Telefone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((m) => {
                const team = teams.find((t) => t.id === m.teamId);
                return (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                    <td className="px-4 py-3 text-gray-600">{team?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {m.phone ? (
                        <a href={`tel:${m.phone}`} className="flex items-center gap-1 hover:text-blue-600">
                          <Phone size={13} /> {m.phone}
                        </a>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(m)}>
                        <Badge variant={m.active ? "green" : "gray"}>
                          {m.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openEdit(m)} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(m.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center text-gray-400 py-10">Nenhum membro encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar Membro" : "Novo Membro"} size="sm">
        <div className="space-y-4">
          <Input label="Nome completo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="João da Silva" />
          <Input label="Telefone / WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
          <Select label="Equipe" value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
            <option value="">Selecione a equipe</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
