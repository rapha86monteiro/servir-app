"use client";

import { useEffect, useState } from "react";
import { ConfigTabs } from "@/components/layout/ConfigTabs";
import { getTeams, createTeam, updateTeam, deleteTeam } from "@/lib/firestore/teams";
import { getTeamColor } from "@/lib/teamColors";
import type { Team } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Plus, Pencil, Trash2, Copy, Check, Share2, Link2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

const COLOR_PALETTE = [
  "#15803d", "#22c55e", "#047857", "#0d9488",
  "#1d4ed8", "#4f46e5", "#7e22ce", "#dc2626",
  "#ea580c", "#f59e0b", "#92400e", "#f9a8d4",
  "#0a0a0a", "#6b7280", "#0891b2", "#be185d",
];

export default function TeamsPage() {
  const { appUser } = useAuth();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [form, setForm] = useState({ name: "", color: COLOR_PALETTE[0] });
  const [copied, setCopied] = useState(false);

  const isAdmin = appUser?.role === "admin" || appUser?.funcao === "Coordenador";

  useEffect(() => {
    if (appUser && !isAdmin) router.push("/app/dashboard");
    load();
  }, [appUser]);

  async function load() {
    setLoading(true);
    const t = await getTeams();
    t.sort((a, b) => a.name.localeCompare(b.name));
    setTeams(t);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: "", color: COLOR_PALETTE[0] });
    setModalOpen(true);
  }

  function openEdit(team: Team) {
    setEditing(team);
    setForm({ name: team.name, color: team.color ?? getTeamColor(team.name).bg });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    if (editing) await updateTeam(editing.id, { name: form.name, color: form.color });
    else await createTeam({ name: form.name, color: form.color, leaderIds: [], memberIds: [] });
    setModalOpen(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta equipe?")) return;
    await deleteTeam(id);
    load();
  }

  const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/convite` : "";

  async function copyLink() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp() {
    const text = `Olá! Você foi convidado para o Departamento Servir da Belém Church.\n\nFaça seu cadastro pelo link e aguarde a aprovação do coordenador:\n${inviteUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-500 text-sm">Equipes, aprovações e permissões</p>
      </div>

      <ConfigTabs />

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">{teams.length} equipes cadastradas</p>
        <Button onClick={openCreate} size="sm"><Plus size={15} /> Nova</Button>
      </div>

      {/* Link único */}
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-4 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Link2 size={14} className="text-white/60" />
          <p className="text-xs font-bold text-white/60 uppercase tracking-wide">Link único de cadastro</p>
        </div>
        <p className="text-xs text-white/50 mb-3">Compartilhe este link. Quem se cadastrar escolhe a função e equipe — você aprova depois.</p>
        <div className="bg-white/10 rounded-lg p-2 mb-3 break-all text-xs font-mono">{inviteUrl}</div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={copyLink} className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black rounded-lg text-xs font-semibold hover:bg-gray-100">
            {copied ? <><Check size={12} className="text-green-500" /> Copiado!</> : <><Copy size={12} /> Copiar</>}
          </button>
          <button onClick={shareWhatsApp} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600">
            <Share2 size={12} /> WhatsApp
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-black" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {teams.map((team) => {
            const colorHex = team.color ?? getTeamColor(team.name).bg;
            return (
              <div key={team.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white" style={{ backgroundColor: colorHex }}>
                      {team.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{team.name}</p>
                      <p className="text-xs text-gray-400">{team.memberIds?.length ?? 0} membros</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(team)} className="p-1.5 text-gray-300 hover:text-blue-500"><Pencil size={13} /></button>
                    <button onClick={() => handleDelete(team.id)} className="p-1.5 text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            );
          })}
          {teams.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-12 col-span-full">Nenhuma equipe cadastrada.</p>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar Equipe" : "Nova Equipe"} size="sm">
        <div className="space-y-4">
          <Input
            label="Nome da equipe"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: ASER, LEVI, JUDA..."
            autoFocus
          />
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Cor da equipe</label>
            <div className="grid grid-cols-8 gap-2 mb-3">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`aspect-square rounded-lg transition-transform hover:scale-110 ${form.color === c ? "ring-2 ring-offset-2 ring-black scale-110" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-12 h-10 rounded-lg cursor-pointer border border-gray-200"
              />
              <input
                type="text"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                placeholder="#000000"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: form.color }}>
              {(form.name || "EQUIPE").toUpperCase()}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
