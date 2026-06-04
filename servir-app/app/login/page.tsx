"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getUserProfile, signOut } from "@/lib/auth";
import { Input } from "@/components/ui/Input";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const cred = await signIn(email, password);
      const profile = await getUserProfile(cred.user.uid);
      if (profile && (profile as any).status === "pending") {
        await signOut();
        setError("⏳ Sua conta ainda está aguardando aprovação do coordenador.");
        setLoading(false);
        return;
      }
      if (profile && (profile as any).status === "rejected") {
        await signOut();
        setError("❌ Seu cadastro não foi aprovado. Entre em contato com o coordenador.");
        setLoading(false);
        return;
      }
      const token = await cred.user.getIdToken();
      document.cookie = `firebase-token=${token}; path=/; max-age=3600`;
      router.push("/app/dashboard");
    } catch {
      setError("E-mail ou senha incorretos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mb-5 overflow-hidden shadow-2xl">
            <Image src="/logo.png" alt="Belém Church" width={80} height={80} className="object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Belém Church</h1>
          <p className="text-white/40 text-sm mt-1 tracking-widest font-medium">SERVIR</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-2xl space-y-4">
          <div>
            <p className="text-gray-900 font-semibold mb-1">Acesse sua conta</p>
            <p className="text-gray-400 text-xs">Área restrita para líderes e administradores</p>
          </div>
          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="lider@belemchurch.com"
            required
          />
          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0a0a0a] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <div className="text-center pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400">Ainda não tem cadastro?</p>
            <Link href="/convite" className="text-sm text-black font-semibold hover:underline">
              Solicitar acesso
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
