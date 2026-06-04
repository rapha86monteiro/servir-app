"use client";

import { useEffect, useState } from "react";
import { getTeams } from "@/lib/firestore/teams";
import { createUser, getUserProfile } from "@/lib/auth";
import { getDocs, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Team, AppUser } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Plus, User, Mail, Key } from "lucide-react";

export default function LideresPage() {
  const { appUser } = useAuth();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [lideres, setLideres] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", teamId: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (appUser && appUser.role !== "admin") router.push("/app/dashboard");
    load();
  }, [appUser]);

  async function load() {
    setLoading(true);
    const [t] = await Promise.all([getTeams()]);
    setTeams(t);

    // Buscar líderes no Firestore
    const q = query(collection(db, "users"), where("role", "==", "leader"));
    const snap = await getDocs(q);
    setLideres(snap.docs.map((d) => d.data() as AppUser));
    setLoading(false);
  }

  async function handleCreate() {
    if (!form.name || !form.email || !form.password || !form.teamId) {
      setError("Preencha todos os campos.");
      return;
    }
    if (form.password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createUser(form.email, form.password, form.name, "leader", [form.teamId]);
      setModalOpen(false);
      setForm({ name: "", email: "", password: "", teamId: "" });
      load();
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError("Este e-mail já está em uso.");
      } else {
        setError("Erro ao criar líder: " + err.message);
      }
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Líderes</h1>
          <p className="text-gray-500 text-sm">{lideres.length} líderes cadastrados</p>
        </div>
        <Button onClick={() => { setModalOpen(true); setError(""); }} size="sm">
          <Plus size={15} /> Novo Líder
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-2">
          {lideres.map((l) => {
            const leaderTeams = teams.filter((t) => l.teamIds?.includes(t.id));
            return (
              <div key={l.uid} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User size={18} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{l.name}</p>
                    <p className="text-xs text-gray-400">{l.email}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {leaderTeams.map((t) => (
                        <span key={t.id} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Badge variant="blue">Líder</Badge>
                </div>
              </div>
            );
          })}
          {lideres.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
              <p className="text-gray-400 text-sm">Nenhum líder cadastrado ainda.</p>
            </div>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Líder" size="sm">
        <div className="space-y-3">
          <Input
            label="Nome completo"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nome do líder"
          />
          <Input
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="lider@igreja.com"
          />
          <Input
            label="Senha inicial"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Mínimo 6 caracteres"
          />
          <Select
            label="Equipe responsável"
            value={form.teamId}
            onChange={(e) => setForm({ ...form, teamId: e.target.value })}
          >
            <option value="">Selecione a equipe</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Criando..." : "Criar Líder"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
