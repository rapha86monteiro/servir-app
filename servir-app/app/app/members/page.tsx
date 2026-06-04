"use client";

import { useEffect, useState, useRef } from "react";
import { getMembers, getMembersByTeam, createMember, updateMember, deleteMember } from "@/lib/firestore/members";
import { getTeams, getTeamsByLeader } from "@/lib/firestore/teams";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import type { Member, Team, Funcao } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Pencil, Trash2, Phone, Search, LayoutGrid, List, Cake, Crown, Shield, User, Camera, Lock, Check, Bell, BellOff } from "lucide-react";
import { requestNotificationPermission, isNotificationGranted } from "@/lib/notifications";

const FUNCOES: Funcao[] = ["Coordenador", "Líder", "Co-líder", "Voluntário"];
const FUNCAO_COLORS: Record<Funcao, string> = {
  "Coordenador": "bg-purple-100 text-purple-700",
  "Líder": "bg-blue-100 text-blue-700",
  "Co-líder": "bg-cyan-100 text-cyan-700",
  "Voluntário": "bg-green-100 text-green-700",
};
const FUNCAO_ICONS: Record<Funcao, any> = {
  "Coordenador": Crown, "Líder": Shield, "Co-líder": Shield, "Voluntário": User,
};
const TEAM_COLORS = [
  "border-l-green-500","border-l-blue-500","border-l-orange-500","border-l-purple-500",
  "border-l-red-500","border-l-yellow-500","border-l-pink-500","border-l-teal-500",
  "border-l-indigo-500","border-l-cyan-500","border-l-emerald-500","border-l-rose-500",
];
const TEAM_DOT_COLORS = [
  "bg-green-500","bg-blue-500","bg-orange-500","bg-purple-500",
  "bg-red-500","bg-yellow-500","bg-pink-500","bg-teal-500",
  "bg-indigo-500","bg-cyan-500","bg-emerald-500","bg-rose-500",
];

function formatAniversario(dateStr: string) {
  if (!dateStr) return "";
  const [, month, day] = dateStr.split("-");
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${parseInt(day)} ${months[parseInt(month) - 1]}`;
}

function isAniversarioEsteMes(dateStr: string) {
  if (!dateStr) return false;
  return parseInt(dateStr.split("-")[1]) === new Date().getMonth() + 1;
}

function compressImage(file: File, maxWidth = 400): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const empty = { name: "", email: "", phone: "", teamId: "", funcao: "Voluntário" as Funcao, aniversario: "", active: true };

export default function MembersPage() {
  const { appUser, firebaseUser } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [filterFuncao, setFilterFuncao] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState(empty);
  const [view, setView] = useState<"cards" | "list">("cards");

  // Perfil do usuário logado
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState({ name: "", phone: "", aniversario: "", photo: "" });
  const [pwd, setPwd] = useState({ current: "", new: "", confirm: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [profMsg, setProfMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pwdMsg, setPwdMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifBusy, setNotifBusy] = useState(false);
  const [notifMsg, setNotifMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setNotifEnabled(isNotificationGranted());
  }, [profileOpen]);

  async function handleEnableNotifications() {
    const uid = firebaseUser?.uid ?? auth.currentUser?.uid ?? appUser?.uid;
    if (!uid) return;
    setNotifBusy(true);
    setNotifMsg(null);
    const r = await requestNotificationPermission(uid);
    setNotifMsg({ ok: r.ok, text: r.message });
    if (r.ok) setNotifEnabled(true);
    setNotifBusy(false);
  }

  const isAdmin = appUser?.role === "admin" || appUser?.funcao === "Coordenador";
  const isLeader = isAdmin || appUser?.funcao === "Líder" || appUser?.funcao === "Co-líder";

  useEffect(() => { load(); loadProfile(); }, [appUser]);

  async function load() {
    if (!appUser) return;
    setLoading(true);
    const [t, m] = await Promise.all([
      isAdmin ? getTeams() : getTeamsByLeader(appUser.uid),
      isAdmin ? getMembers() : Promise.all(
        appUser.teamIds.map((tid) => getMembersByTeam(tid))
      ).then((r) => r.flat()),
    ]);
    t.sort((a, b) => a.name.localeCompare(b.name));
    m.sort((a, b) => a.name.localeCompare(b.name));
    setTeams(t);
    setMembers(m);
    setLoading(false);
  }

  async function loadProfile() {
    const uid = firebaseUser?.uid ?? auth.currentUser?.uid ?? appUser?.uid;
    if (!uid) return;
    try {
      const snap = await getDoc(doc(db, "users", uid));
      const data: any = snap.data() ?? {};
      setProfile({
        name: data.name ?? appUser?.name ?? "",
        phone: data.phone ?? "",
        aniversario: data.aniversario ?? "",
        photo: data.photo ?? "",
      });
    } catch (err) {
      console.error("Erro ao carregar perfil:", err);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...empty, teamId: teams[0]?.id ?? "" });
    setModalOpen(true);
  }

  function openEdit(m: Member) {
    setEditing(m);
    setForm({
      name: m.name, email: m.email ?? "", phone: m.phone,
      teamId: m.teamId, funcao: m.funcao ?? "Voluntário",
      aniversario: m.aniversario ?? "", active: m.active,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.teamId) return;
    try {
      if (editing) await updateMember(editing.id, form);
      else await createMember(form);
      setModalOpen(false);
      load();
    } catch (err) {
      alert("Erro: " + String(err));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir membro?")) return;
    await deleteMember(id);
    load();
  }

  // Perfil
  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setProfile({ ...profile, photo: compressed });
  }

  async function handleSaveProfile() {
    const fbUid = firebaseUser?.uid;
    const authUid = auth.currentUser?.uid;
    const appUid = appUser?.uid;
    const uid = fbUid ?? authUid ?? appUid;
    alert(`DEBUG\nfirebaseUser.uid: ${fbUid ?? "VAZIO"}\nauth.currentUser.uid: ${authUid ?? "VAZIO"}\nappUser.uid: ${appUid ?? "VAZIO"}\nuid final: ${uid ?? "VAZIO"}`);
    if (!uid) {
      setProfMsg({ type: "error", text: "Usuário não identificado." });
      return;
    }
    setSavingProfile(true);
    setProfMsg(null);
    try {
      const data: Record<string, string> = {
        name: String(profile.name ?? ""),
        phone: String(profile.phone ?? ""),
        aniversario: String(profile.aniversario ?? ""),
      };
      if (profile.photo) data.photo = String(profile.photo);

      await updateDoc(doc(db, "users", uid), data);
      setProfMsg({ type: "success", text: "Perfil atualizado!" });
      setTimeout(() => setProfMsg(null), 3000);
    } catch (err: any) {
      console.error("Erro ao salvar perfil:", err);
      setProfMsg({ type: "error", text: "Erro: " + (err?.message ?? String(err)) });
    }
    setSavingProfile(false);
  }

  async function handleChangePassword() {
    if (!auth.currentUser?.email) return;
    if (pwd.new !== pwd.confirm) {
      setPwdMsg({ type: "error", text: "Senhas não coincidem." });
      return;
    }
    if (pwd.new.length < 6) {
      setPwdMsg({ type: "error", text: "Mínimo 6 caracteres." });
      return;
    }
    setSavingPwd(true);
    try {
      const cred = EmailAuthProvider.credential(auth.currentUser.email, pwd.current);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, pwd.new);
      setPwdMsg({ type: "success", text: "Senha alterada!" });
      setPwd({ current: "", new: "", confirm: "" });
      setTimeout(() => setPwdMsg(null), 3000);
    } catch (err: any) {
      setPwdMsg({ type: "error", text: err.code === "auth/wrong-password" || err.code === "auth/invalid-credential" ? "Senha atual incorreta." : "Erro: " + err.message });
    }
    setSavingPwd(false);
  }

  const filtered = members.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchTeam = !filterTeam || m.teamId === filterTeam;
    const matchFuncao = !filterFuncao || m.funcao === filterFuncao;
    return matchSearch && matchTeam && matchFuncao;
  });

  const grouped = teams.map((team, idx) => ({
    team,
    color: TEAM_COLORS[idx % TEAM_COLORS.length],
    dot: TEAM_DOT_COLORS[idx % TEAM_DOT_COLORS.length],
    members: filtered.filter((m) => m.teamId === team.id),
  })).filter((g) => g.members.length > 0 || (!filterTeam && !filterFuncao && !search));

  const initial = profile.name?.charAt(0).toUpperCase() ?? "?";
  const myFuncao = appUser?.funcao ?? (appUser?.role === "admin" ? "Coordenador" : "Voluntário");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Membros</h1>
          <p className="text-gray-500 text-sm">{members.length} membros cadastrados</p>
        </div>
        {isLeader && (
          <Button onClick={openCreate} size="sm"><Plus size={15} /> Novo</Button>
        )}
      </div>

      {/* Meu Perfil */}
      <button
        onClick={() => setProfileOpen(true)}
        className="w-full bg-gradient-to-br from-gray-900 to-black rounded-2xl p-4 text-left text-white hover:opacity-95 transition-opacity"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 flex items-center justify-center text-xl font-bold flex-shrink-0">
            {profile.photo ? (
              <img src={profile.photo} alt="" className="w-full h-full object-cover" />
            ) : initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/50 uppercase tracking-wide">Meu Perfil</p>
            <p className="font-bold truncate">{profile.name || appUser?.email}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-block mt-1 ${FUNCAO_COLORS[myFuncao] ?? "bg-white/20 text-white"}`}>
              {myFuncao}
            </span>
          </div>
          <Pencil size={16} className="text-white/40 flex-shrink-0" />
        </div>
      </button>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar membro..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Todas equipes</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={filterFuncao} onChange={(e) => setFilterFuncao(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Todas funções</option>
          {FUNCOES.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          <button onClick={() => setView("cards")} className={`px-3 py-2 ${view === "cards" ? "bg-black text-white" : "text-gray-400"}`}>
            <LayoutGrid size={16} />
          </button>
          <button onClick={() => setView("list")} className={`px-3 py-2 ${view === "list" ? "bg-black text-white" : "text-gray-400"}`}>
            <List size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-black" />
        </div>
      ) : view === "cards" ? (
        <div className="space-y-6">
          {grouped.map(({ team, color, dot, members: teamMembers }) => (
            <div key={team.id}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-3 h-3 rounded-full ${dot}`} />
                <h2 className="font-bold text-gray-900">{team.name}</h2>
                <span className="text-xs text-gray-400">{teamMembers.length} pessoa{teamMembers.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {teamMembers.map((m) => {
                  const Icon = FUNCAO_ICONS[m.funcao ?? "Voluntário"];
                  return (
                    <div key={m.id} className={`bg-white rounded-xl border-l-4 ${color} border border-gray-100 shadow-sm p-4`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{m.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${FUNCAO_COLORS[m.funcao ?? "Voluntário"]}`}>
                            <Icon size={10} /> {m.funcao ?? "Voluntário"}
                          </span>
                        </div>
                        {isLeader && (
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => openEdit(m)} className="p-1 text-gray-300 hover:text-blue-500"><Pencil size={13} /></button>
                            {isAdmin && (
                              <button onClick={() => handleDelete(m.id)} className="p-1 text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1 mt-2">
                        {m.phone && (
                          <a href={`https://wa.me/55${m.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-gray-500 hover:text-green-600">
                            <Phone size={12} /> {m.phone}
                          </a>
                        )}
                        {m.aniversario && (
                          <div className={`flex items-center gap-2 text-xs ${isAniversarioEsteMes(m.aniversario) ? "text-pink-500 font-semibold" : "text-gray-400"}`}>
                            <Cake size={12} /> {formatAniversario(m.aniversario)}
                            {isAniversarioEsteMes(m.aniversario) && " · Este mês 🎉"}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-12">Nenhum membro encontrado</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Equipe</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Função</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Telefone</th>
                {isLeader && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((m) => {
                const team = teams.find((t) => t.id === m.teamId);
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{m.name}</p>
                      <p className="text-xs text-gray-400 sm:hidden">{team?.name}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{team?.name ?? "-"}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FUNCAO_COLORS[m.funcao ?? "Voluntário"]}`}>
                        {m.funcao ?? "Voluntário"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{m.phone || "-"}</td>
                    {isLeader && (
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => openEdit(m)} className="p-1.5 text-gray-400 hover:text-blue-600"><Pencil size={14} /></button>
                          {isAdmin && (
                            <button onClick={() => handleDelete(m.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                          )}
                        </div>
                      </td>
                    )}
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

      {/* Modal cadastrar/editar membro */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar Membro" : "Novo Membro"} size="sm">
        <div className="space-y-3">
          <Input label="Nome completo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="João da Silva" />
          <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="joao@email.com" />
          <Input label="Telefone / WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(21) 99999-9999" />
          <Select label="Equipe" value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
            <option value="">Selecione</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <Select label="Função" value={form.funcao} onChange={(e) => setForm({ ...form, funcao: e.target.value as Funcao })}>
            {FUNCOES.map((f) => <option key={f} value={f}>{f}</option>)}
          </Select>
          <Input label="Aniversário" type="date" value={form.aniversario} onChange={(e) => setForm({ ...form, aniversario: e.target.value })} />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Meu Perfil */}
      <Modal open={profileOpen} onClose={() => setProfileOpen(false)} title="Meu Perfil" size="md">
        <div className="space-y-4">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-gray-700 to-black flex items-center justify-center text-white text-2xl font-bold">
                {profile.photo ? <img src={profile.photo} alt="" className="w-full h-full object-cover" /> : initial}
              </div>
              <button onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 w-8 h-8 bg-black rounded-full flex items-center justify-center text-white border-2 border-white">
                <Camera size={12} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            </div>
            <p className="text-xs text-gray-400 mt-2">{appUser?.email}</p>
          </div>

          <div className="space-y-3">
            <Input label="Nome" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            <Input label="Telefone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="(21) 99999-9999" />
            <Input label="Aniversário" type="date" value={profile.aniversario} onChange={(e) => setProfile({ ...profile, aniversario: e.target.value })} />
            {profMsg && (
              <div className={`text-sm p-2 rounded-lg flex items-center gap-2 ${profMsg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {profMsg.type === "success" && <Check size={12} />} {profMsg.text}
              </div>
            )}
            <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full">
              {savingProfile ? "Salvando..." : "Salvar Perfil"}
            </Button>
          </div>

          {/* Notificações Push */}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-gray-500" />
              <p className="font-semibold text-gray-900 text-sm">Notificações</p>
            </div>
            <div className={`p-3 rounded-xl border ${notifEnabled ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
              <div className="flex items-start gap-2">
                {notifEnabled ? <Bell size={14} className="text-green-600 mt-0.5" /> : <BellOff size={14} className="text-gray-400 mt-0.5" />}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${notifEnabled ? "text-green-700" : "text-gray-700"}`}>
                    {notifEnabled ? "Notificações ativas" : "Notificações desativadas"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {notifEnabled
                      ? "Você receberá alertas de escalas, substituições e avisos."
                      : "Ative para receber alertas no seu celular."}
                  </p>
                </div>
              </div>
            </div>
            {notifMsg && (
              <div className={`text-sm p-2 rounded-lg ${notifMsg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {notifMsg.text}
              </div>
            )}
            {!notifEnabled && (
              <Button onClick={handleEnableNotifications} disabled={notifBusy} variant="secondary" className="w-full">
                <Bell size={14} /> {notifBusy ? "Ativando..." : "Ativar notificações"}
              </Button>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center gap-2">
              <Lock size={14} className="text-gray-500" />
              <p className="font-semibold text-gray-900 text-sm">Alterar Senha</p>
            </div>
            <Input label="Senha atual" type="password" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} />
            <Input label="Nova senha" type="password" value={pwd.new} onChange={(e) => setPwd({ ...pwd, new: e.target.value })} placeholder="Mínimo 6 caracteres" />
            <Input label="Confirmar nova senha" type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} />
            {pwdMsg && (
              <div className={`text-sm p-2 rounded-lg flex items-center gap-2 ${pwdMsg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {pwdMsg.type === "success" && <Check size={12} />} {pwdMsg.text}
              </div>
            )}
            <Button variant="secondary" onClick={handleChangePassword} disabled={savingPwd || !pwd.current || !pwd.new} className="w-full">
              {savingPwd ? "Alterando..." : "Alterar senha"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
