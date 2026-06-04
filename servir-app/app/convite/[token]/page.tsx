"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { query, collection, where, getDocs, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc as firestoreDoc, setDoc } from "firebase/firestore";
import { Input } from "@/components/ui/Input";
import Image from "next/image";
import type { Team } from "@/lib/types";

export default function ConvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function load() {
      const q = query(collection(db, "teams"), where("inviteToken", "==", token));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setTeam({ id: snap.docs[0].id, ...snap.docs[0].data() } as Team);
      }
      setLoading(false);
    }
    load();
  }, [token]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError("Preencha todos os campos.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (form.password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await setDoc(firestoreDoc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        name: form.name,
        email: form.email,
        role: "member",
        teamIds: [team!.id],
      });
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError("Este e-mail já está cadastrado.");
      } else {
        setError("Erro ao criar conta: " + err.message);
      }
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full">
          <p className="text-2xl mb-2">❌</p>
          <p className="font-bold text-gray-900">Link inválido</p>
          <p className="text-gray-400 text-sm mt-1">Este link de convite não é válido ou expirou.</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-bold text-gray-900 text-lg">Conta criada!</p>
          <p className="text-gray-400 text-sm mt-1">Redirecionando para o login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-4 overflow-hidden shadow-2xl">
            <Image src="/logo.png" alt="Belém Church" width={64} height={64} className="object-contain" />
          </div>
          <h1 className="text-xl font-bold text-white">Belém Church</h1>
          <p className="text-white/40 text-xs tracking-widest mt-0.5">SERVIR</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="text-center pb-2 border-b border-gray-100">
            <p className="font-bold text-gray-900">Convite para a equipe</p>
            <p className="text-lg font-bold text-black mt-0.5">{team.name}</p>
            <p className="text-gray-400 text-xs mt-1">Crie sua conta para acessar o app</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-3">
            <Input
              label="Nome completo"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Seu nome"
              required
            />
            <Input
              label="E-mail"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="seu@email.com"
              required
            />
            <Input
              label="Senha"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Mínimo 6 caracteres"
              required
            />
            <Input
              label="Confirmar senha"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              placeholder="Repita a senha"
              required
            />
            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#0a0a0a] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
            >
              {saving ? "Criando conta..." : "Criar conta"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
