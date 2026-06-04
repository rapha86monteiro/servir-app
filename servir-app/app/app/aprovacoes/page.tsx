"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, updateDoc, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser, Team, Funcao } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Check, X, Phone, Cake, Mail, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ConfigTabs } from "@/components/layout/ConfigTabs";

const FUNCOES: Funcao[] = ["Coordenador", "Líder", "Co-líder", "Voluntário"];
const FUNCAO_COLORS: Record<string, string> = {
  "Coordenador": "bg-purple-100 text-purple-700",
  "Líder": "bg-blue-100 text-blue-700",
  "Co-líder": "bg-cyan-100 text-cyan-700",
  "Voluntário": "bg-green-100 text-green-700",
};

export default function AprovacoesPage() {
  const { appUser } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState<AppUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  // Edição
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", aniversario: "", funcao: "Voluntário" as Funcao, teamId: "" });

  const isAdmin = appUser?.role === "admin" || appUser?.funcao === "Coordenador";

  useEffect(() => {
    if (appUser && !isAdmin) router.push("/app/dashboard");
    load();
  }, [appUser]);

  async function load() {
    setLoading(true);
    const q = query(collection(db, "users"), where("status", "==", "pending"));
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as AppUser));
    items.sort((a: any, b: any) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
    setPending(items);

    const teamsSnap = await getDocs(collection(db, "teams"));
    const t = teamsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Team));
    t.sort((a, b) => a.name.localeCompare(b.name));
    setTeams(t);
    setLoading(false);
  }

  function openEdit(u: AppUser) {
    setEditUser(u);
    setEditForm({
      name: u.name ?? "",
      phone: (u as any).phone ?? "",
      aniversario: (u as any).aniversario ?? "",
      funcao: (u.funcao as Funcao) ?? "Voluntário",
      teamId: u.teamIds?.[0] ?? "",
    });
  }

  async function saveEdit() {
    if (!editUser) return;
    setActing(editUser.uid);
    try {
      const role = editForm.funcao === "Voluntário" ? "member" : "leader";
      await updateDoc(doc(db, "users", editUser.uid), {
        name: editForm.name,
        phone: editForm.phone,
        aniversario: editForm.aniversario,
        funcao: editForm.funcao,
        role,
        teamIds: editForm.teamId ? [editForm.teamId] : [],
      });
      setEditUser(null);
      await load();
    } catch (err) {
      alert("Erro: " + String(err));
    }
    setActing(null);
  }

  async function saveAndApprove() {
    if (!editUser) return;
    setActing(editUser.uid);
    try {
      const role = editForm.funcao === "Voluntário" ? "member" : "leader";
      await updateDoc(doc(db, "users", editUser.uid), {
        name: editForm.name,
        phone: editForm.phone,
        aniversario: editForm.aniversario,
        funcao: editForm.funcao,
        role,
        teamIds: editForm.teamId ? [editForm.teamId] : [],
        status: "approved",
      });
      await addDoc(collection(db, "members"), {
        name: editForm.name,
        email: editUser.email,
        phone: editForm.phone,
        teamId: editForm.teamId,
        funcao: editForm.funcao,
        aniversario: editForm.aniversario,
        active: true,
        uid: editUser.uid,
      });
      setEditUser(null);
      await load();
    } catch (err) {
      alert("Erro: " + String(err));
    }
    setActing(null);
  }

  async function approve(user: AppUser) {
    setActing(user.uid);
    try {
      await updateDoc(doc(db, "users", user.uid), { status: "approved" });
      await addDoc(collection(db, "members"), {
        name: user.name,
        email: user.email,
        phone: (user as any).phone ?? "",
        teamId: user.teamIds?.[0] ?? "",
        funcao: user.funcao ?? "Voluntário",
        aniversario: (user as any).aniversario ?? "",
        active: true,
        uid: user.uid,
      });
      load();
    } catch (err) {
      alert("Erro: " + String(err));
    }
    setActing(null);
  }

  async function reject(user: AppUser) {
    if (!confirm(`Rejeitar e excluir o cadastro de ${user.name}? O e-mail ficará liberado para um novo cadastro.`)) return;
    setActing(user.uid);
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid }),
      });
      const data = await res.json();
      if (data.error) {
        await updateDoc(doc(db, "users", user.uid), { status: "rejected" });
        alert("Aviso: cadastro marcado como rejeitado, mas o e-mail pode continuar preso. (" + data.error + ")");
      }
      load();
    } catch (err) {
      alert("Erro: " + String(err));
    }
    setActing(null);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-black" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-500 text-sm">{pending.length} cadastro{pending.length !== 1 ? "s" : ""} pendente{pending.length !== 1 ? "s" : ""}</p>
      </div>

      <ConfigTabs />

      {pending.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <Check size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Nenhum cadastro pendente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((u) => {
            const team = teams.find((t) => t.id === u.teamIds?.[0]);
            return (
              <div key={u.uid} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-black flex items-center justify-center text-white font-bold flex-shrink-0">
                    {u.name?.charAt(0).toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{u.name}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FUNCAO_COLORS[u.funcao ?? "Voluntário"]}`}>
                        {u.funcao ?? "Voluntário"}
                      </span>
                      {team && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{team.name}</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => openEdit(u)} className="p-1.5 text-gray-400 hover:text-blue-600 flex-shrink-0">
                    <Pencil size={15} />
                  </button>
                </div>

                <div className="space-y-1 text-xs text-gray-500 mb-3">
                  <div className="flex items-center gap-2"><Mail size={12} /> {u.email}</div>
                  {(u as any).phone && <div className="flex items-center gap-2"><Phone size={12} /> {(u as any).phone}</div>}
                  {(u as any).aniversario && <div className="flex items-center gap-2"><Cake size={12} /> {(u as any).aniversario}</div>}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => approve(u)}
                    disabled={acting === u.uid}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-xl font-medium text-sm hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    <Check size={15} /> {acting === u.uid ? "..." : "Aprovar"}
                  </button>
                  <button
                    onClick={() => openEdit(u)}
                    disabled={acting === u.uid}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <Pencil size={14} /> Editar
                  </button>
                  <button
                    onClick={() => reject(u)}
                    disabled={acting === u.uid}
                    className="flex items-center justify-center px-3 py-2.5 border border-red-200 text-red-500 rounded-xl text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de edição */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Editar cadastro" size="sm">
        <div className="space-y-3">
          <Input label="Nome" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          <p className="text-xs text-gray-400">E-mail: {editUser?.email}</p>
          <Input label="Telefone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="(21) 99999-9999" />
          <Input label="Aniversário" type="date" value={editForm.aniversario} onChange={(e) => setEditForm({ ...editForm, aniversario: e.target.value })} />
          <Select label="Função" value={editForm.funcao} onChange={(e) => setEditForm({ ...editForm, funcao: e.target.value as Funcao })}>
            {FUNCOES.map((f) => <option key={f} value={f}>{f}</option>)}
          </Select>
          <Select label="Equipe" value={editForm.teamId} onChange={(e) => setEditForm({ ...editForm, teamId: e.target.value })}>
            <option value="">Sem equipe</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={saveEdit} disabled={!!acting}>
              Só salvar
            </Button>
            <Button onClick={saveAndApprove} disabled={!!acting}>
              <Check size={14} /> Salvar e Aprovar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
