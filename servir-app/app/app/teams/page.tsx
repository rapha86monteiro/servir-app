"use client";

import { useEffect, useState } from "react";
import { getTeams, createTeam, updateTeam, deleteTeam } from "@/lib/firestore/teams";
import type { Team } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Plus, Pencil, Trash2, Users, Copy, Check, Crown, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

type LinkType = "member" | "leader";

export default function TeamsPage() {
  const { appUser } = useAuth();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [name, setName] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

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
      await createTeam({
        name,
        leaderIds: [],
        memberIds: [],
        inviteToken: uuidv4(),
        leaderInviteToken: uuidv4(),
      });
    }
    setModalOpen(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta equipe?")) return;
    await deleteTeam(id);
    load();
  }

  async function regenerateToken(team: Team, type: LinkType) {
    if (!confirm("Gerar novo link? O link anterior deixará de funcionar.")) return;
    if (type === "leader") {
      await updateTeam(team.id, { leaderInviteToken: uuidv4() });
    } else {
      await updateTeam(team.id, { inviteToken: uuidv4() });
    }
    load();
  }

  async function ensureLeaderToken(team: Team) {
    await updateTeam(team.id, { leaderInviteToken: uuidv4() });
    load();
  }
  async function ensureMemberToken(team: Team) {
    await updateTeam(team.id, { inviteToken: uuidv4() });
    load();
  }

  function getInviteUrl(token: string, type: LinkType) {
    const base = window.location.origin;
    return type === "leader"
      ? `${base}/convite/${token}?tipo=lider`
      : `${base}/convite/${token}`;
  }

  async function copyInviteLink(token: string, type: LinkType) {
    await navigator.clipboard.writeText(getInviteUrl(token, type));
    setCopied(token + type);
    setTimeout(() => setCopied(null), 2000);
  }

  async function shareWhatsApp(team: Team, token: string, type: LinkType) {
    const url = getInviteUrl(token, type);
    const text = type === "leader"
      ? `Olá! Você foi convidado para ser *líder* da equipe *${team.name}* no app do Departamento Servir da Belém Church.\n\nCrie sua conta de líder pelo link:\n${url}`
      : `Olá! Você foi convidado para a equipe *${team.name}* no app do Departamento Servir da Belém Church.\n\nCrie sua conta pelo link:\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Equipes</h1>
          <p className="text-gray-500 text-sm">{teams.length} equipes · Links de convite</p>
        </div>
        <Button onClick={openCreate} size="sm"><Plus size={15} /> Nova</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-black" />
        </div>
      ) : (
        <div className="space-y-3">
          {teams.map((team) => (
            <div key={team.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                    {team.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{team.name}</p>
                    <p className="text-xs text-gray-400">{team.memberIds.length} membros</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(team)} className="p-1.5 text-gray-400 hover:text-blue-600">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(team.id)} className="p-1.5 text-gray-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Link Líder */}
              <div className="bg-blue-50 rounded-xl p-3 mb-2">
                <p className="text-xs font-bold text-blue-700 mb-1.5 flex items-center gap-1">
                  <Crown size={11} /> Link para Líder/Co-líder
                </p>
                {team.leaderInviteToken ? (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => copyInviteLink(team.leaderInviteToken!, "leader")}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      {copied === team.leaderInviteToken + "leader" ? <><Check size={11} className="text-green-500" /> Copiado</> : <><Copy size={11} /> Copiar</>}
                    </button>
                    <button
                      onClick={() => shareWhatsApp(team, team.leaderInviteToken!, "leader")}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      📱 WhatsApp
                    </button>
                    <button
                      onClick={() => regenerateToken(team, "leader")}
                      className="text-xs text-blue-500 hover:underline"
                    >
                      🔄 Novo
                    </button>
                  </div>
                ) : (
                  <button onClick={() => ensureLeaderToken(team)} className="text-xs text-blue-600 hover:underline">
                    + Gerar link
                  </button>
                )}
              </div>

              {/* Link Membro */}
              <div className="bg-green-50 rounded-xl p-3">
                <p className="text-xs font-bold text-green-700 mb-1.5 flex items-center gap-1">
                  <UserPlus size={11} /> Link para Voluntário
                </p>
                {team.inviteToken ? (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => copyInviteLink(team.inviteToken!, "member")}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs bg-white border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                    >
                      {copied === team.inviteToken + "member" ? <><Check size={11} className="text-green-500" /> Copiado</> : <><Copy size={11} /> Copiar</>}
                    </button>
                    <button
                      onClick={() => shareWhatsApp(team, team.inviteToken!, "member")}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      📱 WhatsApp
                    </button>
                    <button
                      onClick={() => regenerateToken(team, "member")}
                      className="text-xs text-green-600 hover:underline"
                    >
                      🔄 Novo
                    </button>
                  </div>
                ) : (
                  <button onClick={() => ensureMemberToken(team)} className="text-xs text-green-600 hover:underline">
                    + Gerar link
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
            Cada equipe terá dois links de convite: um para líderes e outro para voluntários.
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
