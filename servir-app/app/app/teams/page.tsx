"use client";

import { useEffect, useState } from "react";
import { getTeams, createTeam, updateTeam, deleteTeam } from "@/lib/firestore/teams";
import type { Team } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

const TEAM_NAMES = [
  "Estacionamento", "Portão", "Hall de Entrada", "Recepção",
  "Templo", "Frente", "Diretor de Culto", "Banheiro",
  "Mezanino", "Oferta", "Apoio e Limpeza", "Gabinete",
];

export default function TeamsPage() {
  const { appUser } = useAuth();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [name, setName] = useState("");

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
      await createTeam({ name, leaderIds: [], memberIds: [] });
    }
    setModalOpen(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta equipe?")) return;
    await deleteTeam(id);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipes</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie as equipes do departamento Servir</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Nova Equipe
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <div key={team.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users size={20} className="text-blue-600" />
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
            </div>
          ))}
          {teams.length === 0 && (
            <p className="text-gray-400 text-sm col-span-3 text-center py-12">
              Nenhuma equipe cadastrada. Clique em "Nova Equipe" para começar.
            </p>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar Equipe" : "Nova Equipe"} size="sm">
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Nome da equipe</label>
            <select
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="">Selecione ou digite abaixo</option>
              {TEAM_NAMES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <Input
            label="Ou nome personalizado"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Frente Externa"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
