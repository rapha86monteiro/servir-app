"use client";

import { useEffect, useState } from "react";
import { getTeams, createTeam, updateTeam, deleteTeam } from "@/lib/firestore/teams";
import type { Team } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Plus, Pencil, Trash2, Users, Link2, Copy, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

export default function TeamsPage() {
  const { appUser } = useAuth();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [name, setName] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (appUser && appUser.role !== "admin") router.push("/app/dashboard");
    load();
  }, [appUser]);

  async function load() {
    setLoading(true);
    setTeams(await getTeams());
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setName("");
    setModalOpen(true);
  }

  function openEdit(team: Team) {
    setEditing(team);
    setName(team.name);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    if (editing) {
      await updateTeam(editing.id, { name });
    } else {
      await createTeam({ name, leaderIds: [], memberIds: [], inviteToken: uuidv4() });
    }
    setModalOpen(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta equipe?")) return;
    await deleteTeam(id);
    load();
  }

  async function regenerateToken(team: Team) {
    if (!confirm("Gerar novo link? O link anterior deixará de funcionar.")) return;
    await updateTeam(team.id, { inviteToken: uuidv4() });
    load();
  }

  function getInviteUrl(token: string) {
    return `${window.location.origin}/convite/${token}`;
  }

  async function copyInviteLink(token: string) {
    await navigator.clipboard.writeText(getInviteUrl(token));
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  async function shareWhatsApp(team: Team) {
    if (!team.inviteToken) return;
    const url = getInviteUrl(team.inviteToken);
    const text = `Olá! Você foi convidado para a equipe *${team.name}* no app do Departamento Servir da Belém Church.\n\nCrie sua conta pelo link abaixo:\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipes</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie equipes e links de convite</p>
        </div>
        <Button onClick={openCreate}><Plus size={16} /> Nova Equipe</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {teams.map((team) => (
            <div key={team.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                    <Users size={18} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{team.name}</p>
                    <p className="text-xs text-gray-400">{team.memberIds.length} membros</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(team)} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => handleDelete(team.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Link de convite */}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                  <Link2 size={12} /> Link de convite para membros
                </p>
                {team.inviteToken ? (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 break-all font-mono bg-white rounded-lg p-2 border border-gray-200">
                      {typeof window !== "undefined" ? getInviteUrl(team.inviteToken) : "..."}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyInviteLink(team.inviteToken!)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        {copied === team.inviteToken ? <><Check size={12} className="text-green-500" /> Copiado!</> : <><Copy size={12} /> Copiar</>}
                      </button>
                      <button
                        onClick={() => shareWhatsApp(team)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      >
                        📱 WhatsApp
                      </button>
                      <button
                        onClick={() => regenerateToken(team)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                      >
                        🔄 Novo link
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => updateTeam(team.id, { inviteToken: uuidv4() }).then(load)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    + Gerar link de convite
                  </button>
                )}
              </div>
            </div>
          ))}
          {teams.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-12">Nenhuma equipe cadastrada.</p>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar Equipe" : "Nova Equipe"} size="sm">
        <div className="space-y-4">
          <Input
            label="Nome da equipe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: ASER, LEVI, JUDA, BENJAMIM..."
            autoFocus
          />
          <p className="text-xs text-gray-400">
            As equipes representam os grupos que servem em cada culto (não as posições).
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
