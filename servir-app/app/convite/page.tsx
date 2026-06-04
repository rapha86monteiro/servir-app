"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { Input, Select } from "@/components/ui/Input";
import Image from "next/image";
import type { Team, Funcao } from "@/lib/types";
import { Check } from "lucide-react";

const FUNCOES: Funcao[] = ["Coordenador", "Líder", "Co-líder", "Voluntário"];

// Capitaliza primeira letra de cada palavra
function capitalize(name: string) {
  return name
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Apenas números no telefone
function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}

// Formata telefone: (21) 99999-9999
function formatPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function ConvitePage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    aniversario: "",
    funcao: "Voluntário" as Funcao,
    teamId: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(collection(db, "teams"));
        const t = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Team));
        t.sort((a, b) => a.name.localeCompare(b.name));
        setTeams(t);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    load();
  }, []);

  function validateName(name: string) {
    const parts = name.trim().split(" ").filter(Boolean);
    return parts.length >= 2;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Informe seu nome completo.");
      return;
    }
    if (!validateName(form.name)) {
      setError("Informe nome e sobrenome.");
      return;
    }
    if (!form.email.trim()) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (onlyDigits(form.phone).length < 10) {
      setError("Informe um número de WhatsApp válido.");
      return;
    }
    if (!form.aniversario) {
      setError("Informe sua data de nascimento.");
      return;
    }
    if (form.funcao !== "Coordenador" && !form.teamId) {
      setError("Selecione uma equipe.");
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
      const role =
        form.funcao === "Coordenador" || form.funcao === "Líder" || form.funcao === "Co-líder"
          ? "leader"
          : "member";

      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        name: capitalize(form.name.trim()),
        email: form.email.trim().toLowerCase(),
        role,
        funcao: form.funcao,
        teamIds: form.teamId ? [form.teamId] : [],
        phone: form.phone,
        aniversario: form.aniversario,
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      setDone(true);
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError("Este e-mail já está cadastrado.");
      } else if (err.code === "auth/invalid-email") {
        setError("E-mail inválido.");
      } else {
        setError("Erro: " + err.message);
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

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-amber-600" />
          </div>
          <p className="font-bold text-gray-900 text-lg mb-2">Cadastro enviado!</p>
          <p className="text-gray-500 text-sm mb-4">
            Sua conta foi criada e está aguardando aprovação do coordenador.
            Você receberá acesso assim que for aprovado.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full bg-black text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            Ir para o login
          </button>
        </div>
      </div>
    );
  }

  const needsTeam = form.funcao !== "Coordenador";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] p-4 py-8">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-4 overflow-hidden shadow-2xl">
            <Image src="/logo.png" alt="Belém Church" width={64} height={64} className="object-contain" />
          </div>
          <h1 className="text-xl font-bold text-white">Belém Church</h1>
          <p className="text-white/40 text-xs tracking-widest mt-0.5">SERVIR</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-2xl space-y-3">
          <div className="text-center pb-3 border-b border-gray-100">
            <p className="font-bold text-gray-900">Solicitar acesso</p>
            <p className="text-gray-400 text-xs mt-1">
              Preencha os dados. Você terá acesso após aprovação.
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-3">
            <Input
              label="Nome e Sobrenome *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              onBlur={(e) => setForm({ ...form, name: capitalize(e.target.value.trim()) })}
              placeholder="João Silva"
              required
            />
            <Input
              label="E-mail *"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="seu@email.com"
              required
            />
            <Input
              label="WhatsApp *"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
              placeholder="(21) 99999-9999"
              inputMode="numeric"
              required
            />
            <Input
              label="Data de nascimento *"
              type="date"
              value={form.aniversario}
              onChange={(e) => setForm({ ...form, aniversario: e.target.value })}
              required
            />

            <Select
              label="Função *"
              value={form.funcao}
              onChange={(e) =>
                setForm({ ...form, funcao: e.target.value as Funcao, teamId: e.target.value === "Coordenador" ? "" : form.teamId })
              }
            >
              {FUNCOES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </Select>

            {needsTeam && (
              <Select
                label="Equipe *"
                value={form.teamId}
                onChange={(e) => setForm({ ...form, teamId: e.target.value })}
              >
                <option value="">Selecione sua equipe</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            )}

            <Input
              label="Senha *"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Mínimo 6 caracteres"
              required
            />
            <Input
              label="Confirmar senha *"
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
              {saving ? "Enviando..." : "Solicitar acesso"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
