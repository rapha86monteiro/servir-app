"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { User, Mail, Phone, Cake, Camera, Lock, LogOut, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";

const FUNCAO_COLORS: Record<string, string> = {
  "Coordenador": "bg-purple-100 text-purple-700",
  "Líder": "bg-blue-100 text-blue-700",
  "Co-líder": "bg-cyan-100 text-cyan-700",
  "Voluntário": "bg-green-100 text-green-700",
};

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

export default function PerfilPage() {
  const { appUser } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState({
    name: "",
    phone: "",
    aniversario: "",
    photo: "",
  });
  const [pwd, setPwd] = useState({ current: "", new: "", confirm: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pwdMsg, setPwdMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      if (!appUser) return;
      const snap = await getDoc(doc(db, "users", appUser.uid));
      const data = snap.data() ?? {};
      setProfile({
        name: appUser.name ?? "",
        phone: data.phone ?? "",
        aniversario: data.aniversario ?? "",
        photo: data.photo ?? "",
      });
    }
    load();
  }, [appUser]);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setProfile({ ...profile, photo: compressed });
  }

  async function handleSaveProfile() {
    if (!appUser) return;
    setSavingProfile(true);
    setMsg(null);
    try {
      await updateDoc(doc(db, "users", appUser.uid), {
        name: profile.name,
        phone: profile.phone,
        aniversario: profile.aniversario,
        photo: profile.photo,
      });
      setMsg({ type: "success", text: "Perfil atualizado!" });
      setTimeout(() => setMsg(null), 3000);
    } catch (err) {
      setMsg({ type: "error", text: "Erro: " + String(err) });
    }
    setSavingProfile(false);
  }

  async function handleChangePassword() {
    if (!auth.currentUser?.email) return;
    if (pwd.new !== pwd.confirm) {
      setPwdMsg({ type: "error", text: "As senhas não coincidem." });
      return;
    }
    if (pwd.new.length < 6) {
      setPwdMsg({ type: "error", text: "A senha deve ter pelo menos 6 caracteres." });
      return;
    }
    setSavingPwd(true);
    setPwdMsg(null);
    try {
      const cred = EmailAuthProvider.credential(auth.currentUser.email, pwd.current);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, pwd.new);
      setPwdMsg({ type: "success", text: "Senha alterada com sucesso!" });
      setPwd({ current: "", new: "", confirm: "" });
      setTimeout(() => setPwdMsg(null), 3000);
    } catch (err: any) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setPwdMsg({ type: "error", text: "Senha atual incorreta." });
      } else {
        setPwdMsg({ type: "error", text: "Erro: " + err.message });
      }
    }
    setSavingPwd(false);
  }

  async function handleSignOut() {
    await signOut();
    document.cookie = "firebase-token=; Max-Age=0; path=/";
    router.push("/login");
  }

  const initial = profile.name?.charAt(0).toUpperCase() ?? "?";
  const funcao = appUser?.funcao ?? (appUser?.role === "admin" ? "Coordenador" : "Voluntário");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Meu Perfil</h1>
        <p className="text-gray-500 text-sm">Edite suas informações pessoais</p>
      </div>

      {/* Card do perfil */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-5">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-gray-700 to-black flex items-center justify-center text-white text-3xl font-bold">
              {profile.photo ? (
                <img src={profile.photo} alt="" className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-9 h-9 bg-black rounded-full flex items-center justify-center text-white border-2 border-white hover:bg-gray-800 transition-colors"
            >
              <Camera size={15} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
          </div>
          <p className="font-bold text-gray-900 mt-3">{profile.name || "Sem nome"}</p>
          <p className="text-xs text-gray-400">{appUser?.email}</p>
          <span className={`text-xs px-3 py-1 rounded-full font-medium mt-2 ${FUNCAO_COLORS[funcao] ?? "bg-gray-100 text-gray-700"}`}>
            {funcao}
          </span>
        </div>

        {/* Form */}
        <div className="space-y-3">
          <Input
            label="Nome completo"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            placeholder="Seu nome"
          />
          <Input
            label="Telefone / WhatsApp"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            placeholder="(21) 99999-9999"
          />
          <Input
            label="Aniversário"
            type="date"
            value={profile.aniversario}
            onChange={(e) => setProfile({ ...profile, aniversario: e.target.value })}
          />
          {msg && (
            <div className={`text-sm p-3 rounded-lg flex items-center gap-2 ${msg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {msg.type === "success" && <Check size={14} />}
              {msg.text}
            </div>
          )}
          <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full">
            {savingProfile ? "Salvando..." : "Salvar Perfil"}
          </Button>
        </div>
      </div>

      {/* Alterar senha */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={16} className="text-gray-600" />
          <p className="font-bold text-gray-900 text-sm">Alterar Senha</p>
        </div>
        <div className="space-y-3">
          <Input
            label="Senha atual"
            type="password"
            value={pwd.current}
            onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
            placeholder="Digite sua senha atual"
          />
          <Input
            label="Nova senha"
            type="password"
            value={pwd.new}
            onChange={(e) => setPwd({ ...pwd, new: e.target.value })}
            placeholder="Mínimo 6 caracteres"
          />
          <Input
            label="Confirmar nova senha"
            type="password"
            value={pwd.confirm}
            onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
            placeholder="Digite novamente"
          />
          {pwdMsg && (
            <div className={`text-sm p-3 rounded-lg flex items-center gap-2 ${pwdMsg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {pwdMsg.type === "success" && <Check size={14} />}
              {pwdMsg.text}
            </div>
          )}
          <Button
            variant="secondary"
            onClick={handleChangePassword}
            disabled={savingPwd || !pwd.current || !pwd.new}
            className="w-full"
          >
            {savingPwd ? "Alterando..." : "Alterar senha"}
          </Button>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleSignOut}
        className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 transition-colors"
      >
        <LogOut size={16} /> <span className="font-medium">Sair da conta</span>
      </button>
    </div>
  );
}
