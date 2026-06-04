"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { getSchedules } from "@/lib/firestore/schedules";
import { getMembers } from "@/lib/firestore/members";
import { getMinhasIndisponibilidades, addIndisponibilidade, removeIndisponibilidade } from "@/lib/firestore/disponibilidade";
import { requestNotificationPermission, isNotificationGranted } from "@/lib/notifications";
import type { Schedule, Indisponibilidade } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Award, CheckCircle2, XCircle, MapPin, TrendingUp, Calendar,
  CalendarX, Plus, Trash2, Bell, BellOff, Camera, Lock, Check, Info, User, HelpCircle,
} from "lucide-react";
import { abrirTutorial } from "@/components/WelcomeTutorial";

type Tab = "jornada" | "disponibilidade" | "notificacoes" | "dados";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "jornada", label: "Jornada", icon: Award },
  { key: "disponibilidade", label: "Disponib.", icon: CalendarX },
  { key: "notificacoes", label: "Notif.", icon: Bell },
  { key: "dados", label: "Meus Dados", icon: User },
];

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

export default function MinhaAreaPage() {
  const { appUser } = useAuth();
  const [tab, setTab] = useState<Tab>("jornada");
  const [loading, setLoading] = useState(true);

  // Jornada
  const [participacoes, setParticipacoes] = useState<any[]>([]);
  // Disponibilidade
  const [indisp, setIndisp] = useState<Indisponibilidade[]>([]);
  const [dispDate, setDispDate] = useState("");
  const [dispMotivo, setDispMotivo] = useState("");
  const [dispSaving, setDispSaving] = useState(false);
  // Notificações
  const [notifOn, setNotifOn] = useState(false);
  const [notifBusy, setNotifBusy] = useState(false);
  const [notifMsg, setNotifMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // Dados
  const [profile, setProfile] = useState({ name: "", phone: "", aniversario: "", photo: "" });
  const [pwd, setPwd] = useState({ current: "", new: "", confirm: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [profMsg, setProfMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, [appUser]);
  useEffect(() => { setNotifOn(isNotificationGranted()); }, [tab]);

  async function load() {
    const uid = auth.currentUser?.uid ?? appUser?.uid;
    if (!uid) return;
    setLoading(true);
    try {
      const [scheds, members, minhasInd, userSnap] = await Promise.all([
        getSchedules().catch(() => []),
        getMembers().catch(() => []),
        getMinhasIndisponibilidades(uid).catch(() => []),
        getDoc(doc(db, "users", uid)).catch(() => null),
      ]);

      const meu = members.find((m) => m.uid === uid);
      const meuId = meu?.id;

      const parts: any[] = [];
      scheds.forEach((s: Schedule) => {
        if (!s.positions) return;
        Object.entries(s.positions).forEach(([position, slots]) => {
          slots.forEach((slot) => {
            if (slot.memberId === meuId || slot.memberName === appUser?.name) {
              parts.push({ ...slot, position, serviceTitle: s.serviceTitle, serviceDate: s.serviceDate, id: s.id });
            }
          });
        });
      });
      parts.sort((a, b) => b.serviceDate.localeCompare(a.serviceDate));
      setParticipacoes(parts);

      const hoje = new Date().toISOString().split("T")[0];
      setIndisp(minhasInd.filter((i) => i.date >= hoje));

      const data: any = userSnap?.data() ?? {};
      setProfile({ name: data.name ?? "", phone: data.phone ?? "", aniversario: data.aniversario ?? "", photo: data.photo ?? "" });
    } catch {}
    setLoading(false);
  }

  // ===== Jornada =====
  const now = new Date();
  const total = participacoes.length;
  const esteMs = participacoes.filter((p) => {
    const d = new Date(p.serviceDate + "T12:00:00");
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const presencas = participacoes.filter((p) => p.checkedIn === true || (p.checkedIn == null && p.confirmed === true)).length;
  const faltas = participacoes.filter((p) => p.checkedIn === false || p.confirmed === false).length;
  const pctPres = total > 0 ? Math.round((presencas / total) * 100) : 0;
  const posCount: Record<string, number> = {};
  participacoes.forEach((p) => { posCount[p.position] = (posCount[p.position] ?? 0) + 1; });
  const topPos = Object.entries(posCount).sort(([, a], [, b]) => b - a).slice(0, 3);

  // ===== Disponibilidade =====
  async function addDisp() {
    const uid = auth.currentUser?.uid ?? appUser?.uid;
    if (!uid || !dispDate) return;
    setDispSaving(true);
    try {
      const members = await getMembers().catch(() => []);
      const meu = members.find((m) => m.uid === uid);
      await addIndisponibilidade({
        memberId: meu?.id ?? uid, memberName: meu?.name ?? appUser?.name ?? "",
        uid, date: dispDate, motivo: dispMotivo, createdAt: new Date().toISOString(),
      });
      setDispDate(""); setDispMotivo(""); load();
    } catch (e) { alert("Erro: " + String(e)); }
    setDispSaving(false);
  }
  async function removeDisp(id: string) { await removeIndisponibilidade(id); load(); }

  // ===== Notificações =====
  async function enableNotif() {
    const uid = auth.currentUser?.uid ?? appUser?.uid;
    if (!uid) return;
    setNotifBusy(true); setNotifMsg(null);
    const r = await requestNotificationPermission(uid);
    setNotifMsg({ ok: r.ok, text: r.message });
    if (r.ok) setNotifOn(true);
    setNotifBusy(false);
  }

  // ===== Dados =====
  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfile({ ...profile, photo: await compressImage(file) });
  }
  async function saveProfile() {
    const user = auth.currentUser;
    if (!user) { alert("Faça login novamente."); return; }
    setSavingProfile(true); setProfMsg(null);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        name: profile.name || "", phone: profile.phone || "",
        aniversario: profile.aniversario || "", photo: profile.photo || "",
      });
      setProfMsg({ ok: true, text: "Perfil atualizado!" });
      setTimeout(() => setProfMsg(null), 3000);
    } catch (e: any) { setProfMsg({ ok: false, text: "Erro: " + (e?.message ?? e) }); }
    setSavingProfile(false);
  }
  async function changePwd() {
    if (!auth.currentUser?.email) return;
    if (pwd.new !== pwd.confirm) { setPwdMsg({ ok: false, text: "Senhas não coincidem." }); return; }
    if (pwd.new.length < 6) { setPwdMsg({ ok: false, text: "Mínimo 6 caracteres." }); return; }
    setSavingPwd(true);
    try {
      const cred = EmailAuthProvider.credential(auth.currentUser.email, pwd.current);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, pwd.new);
      setPwdMsg({ ok: true, text: "Senha alterada!" });
      setPwd({ current: "", new: "", confirm: "" });
      setTimeout(() => setPwdMsg(null), 3000);
    } catch (e: any) {
      setPwdMsg({ ok: false, text: e.code === "auth/wrong-password" || e.code === "auth/invalid-credential" ? "Senha atual incorreta." : "Erro: " + e.message });
    }
    setSavingPwd(false);
  }

  const initial = profile.name?.charAt(0).toUpperCase() ?? "?";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Minha Área</h1>
        <p className="text-gray-500 text-sm">Sua jornada, disponibilidade e configurações</p>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 min-w-fit flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              tab === key ? "bg-white text-black shadow-sm" : "text-gray-500"
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-black" />
        </div>
      ) : (
        <>
          {/* === JORNADA === */}
          {tab === "jornada" && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-5 text-white">
                <div className="flex items-center gap-2 mb-3">
                  <Award size={20} className="text-yellow-400" />
                  <p className="font-bold">{appUser?.name?.split(" ")[0]}, você já serviu</p>
                </div>
                <p className="text-5xl font-bold">{total}<span className="text-xl text-white/50"> vezes</span></p>
                <p className="text-white/50 text-sm mt-1">{esteMs} {esteMs === 1 ? "vez" : "vezes"} este mês</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
                  <CheckCircle2 size={18} className="text-green-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-900">{presencas}</p>
                  <p className="text-xs text-gray-400">Presenças</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
                  <XCircle size={18} className="text-red-400 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-900">{faltas}</p>
                  <p className="text-xs text-gray-400">Faltas</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
                  <TrendingUp size={18} className="text-blue-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-900">{pctPres}%</p>
                  <p className="text-xs text-gray-400">Presença</p>
                </div>
              </div>
              {topPos.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-3"><MapPin size={16} className="text-gray-600" /><p className="font-bold text-gray-900 text-sm">Onde você mais serve</p></div>
                  <div className="space-y-2">
                    {topPos.map(([pos, count], idx) => (
                      <div key={pos} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{["🥇","🥈","🥉"][idx]} {pos}</span>
                        <span className="text-sm font-bold text-gray-900">{count}x</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3"><Calendar size={16} className="text-gray-600" /><p className="font-bold text-gray-900 text-sm">Histórico</p></div>
                {participacoes.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-6">Você ainda não foi escalado.</p>
                ) : (
                  <div className="space-y-2">
                    {participacoes.map((p, idx) => {
                      const presente = p.checkedIn === true || (p.checkedIn == null && p.confirmed === true);
                      const faltou = p.checkedIn === false || p.confirmed === false;
                      return (
                        <div key={p.id + idx} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{p.position}</p>
                            <p className="text-xs text-gray-400">{p.serviceTitle} · {formatDate(p.serviceDate)}</p>
                          </div>
                          {presente ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Presente</span>
                            : faltou ? <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Faltou</span>
                            : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Escalado</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === DISPONIBILIDADE === */}
          {tab === "disponibilidade" && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-start gap-2">
                <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">Marque os dias que você NÃO pode servir. Seu líder verá e evitará te escalar.</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                <p className="font-semibold text-gray-900 text-sm">Adicionar data indisponível</p>
                <Input label="Data" type="date" value={dispDate} onChange={(e) => setDispDate(e.target.value)} />
                <Input label="Motivo (opcional)" value={dispMotivo} onChange={(e) => setDispMotivo(e.target.value)} placeholder="Ex: Viagem..." />
                <Button onClick={addDisp} disabled={dispSaving || !dispDate} className="w-full"><Plus size={15} /> {dispSaving ? "Salvando..." : "Marcar indisponível"}</Button>
              </div>
              {indisp.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                  <CalendarX size={28} className="text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Você está disponível para todos os cultos 🙌</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {indisp.map((i) => (
                    <div key={i.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center"><CalendarX size={18} className="text-red-400" /></div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{formatDate(i.date)}</p>
                          {i.motivo && <p className="text-xs text-gray-400">{i.motivo}</p>}
                        </div>
                      </div>
                      <button onClick={() => removeDisp(i.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* === NOTIFICAÇÕES === */}
          {tab === "notificacoes" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${notifOn ? "bg-green-100" : "bg-gray-100"}`}>
                    {notifOn ? <Bell size={22} className="text-green-600" /> : <BellOff size={22} className="text-gray-400" />}
                  </div>
                  <div>
                    <p className={`font-bold ${notifOn ? "text-green-700" : "text-gray-900"}`}>{notifOn ? "Notificações ativadas" : "Notificações desativadas"}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{notifOn ? "Você receberá alertas neste dispositivo." : "Ative para receber alertas."}</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">📱 Você vai receber:</p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li>• Nova escala criada para você</li>
                    <li>• Pedidos de substituição</li>
                    <li>• Aniversariantes e lembretes de culto</li>
                    <li>• Avisos do coordenador</li>
                  </ul>
                </div>
                {notifMsg && (
                  <div className={`text-sm p-3 rounded-lg flex items-center gap-2 ${notifMsg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {notifMsg.ok && <Check size={14} />}{notifMsg.text}
                  </div>
                )}
                {!notifOn && <Button onClick={enableNotif} disabled={notifBusy} className="w-full"><Bell size={14} /> {notifBusy ? "Ativando..." : "Ativar notificações"}</Button>}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-amber-700 mb-1">⚠️ iPhone (iOS)</p>
                <p className="text-xs text-amber-600">Adicione o app à tela inicial (Safari → Compartilhar → "Adicionar à Tela de Início") para receber notificações.</p>
              </div>
            </div>
          )}

          {/* === MEUS DADOS === */}
          {tab === "dados" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-gray-700 to-black flex items-center justify-center text-white text-2xl font-bold">
                      {profile.photo ? <img src={profile.photo} alt="" className="w-full h-full object-cover" /> : initial}
                    </div>
                    <button onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 w-8 h-8 bg-black rounded-full flex items-center justify-center text-white border-2 border-white"><Camera size={12} /></button>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{appUser?.email}</p>
                </div>
                <Input label="Nome" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                <Input label="Telefone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="(21) 99999-9999" />
                <Input label="Aniversário" type="date" value={profile.aniversario} onChange={(e) => setProfile({ ...profile, aniversario: e.target.value })} />
                {profMsg && <div className={`text-sm p-2 rounded-lg flex items-center gap-2 ${profMsg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{profMsg.ok && <Check size={12} />}{profMsg.text}</div>}
                <Button onClick={saveProfile} disabled={savingProfile} className="w-full">{savingProfile ? "Salvando..." : "Salvar Perfil"}</Button>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <div className="flex items-center gap-2"><Lock size={14} className="text-gray-500" /><p className="font-semibold text-gray-900 text-sm">Alterar Senha</p></div>
                <Input label="Senha atual" type="password" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} />
                <Input label="Nova senha" type="password" value={pwd.new} onChange={(e) => setPwd({ ...pwd, new: e.target.value })} placeholder="Mínimo 6 caracteres" />
                <Input label="Confirmar nova senha" type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} />
                {pwdMsg && <div className={`text-sm p-2 rounded-lg flex items-center gap-2 ${pwdMsg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{pwdMsg.ok && <Check size={12} />}{pwdMsg.text}</div>}
                <Button variant="secondary" onClick={changePwd} disabled={savingPwd || !pwd.current || !pwd.new} className="w-full">{savingPwd ? "Alterando..." : "Alterar senha"}</Button>
              </div>

              <button onClick={abrirTutorial} className="w-full flex items-center justify-center gap-2 py-3 text-sm text-gray-500 hover:text-gray-700">
                <HelpCircle size={15} /> Ver tutorial do app
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
