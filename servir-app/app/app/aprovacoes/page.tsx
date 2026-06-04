"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser, Team } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Check, X, User, Phone, Cake, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";

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
    setTeams(t);
    setLoading(false);
  }

  async function approve(user: AppUser) {
    setActing(user.uid);
    try {
      // Atualizar status do usuário
      await updateDoc(doc(db, "users", user.uid), { status: "approved" });

      // Criar registro em "members" para entrar na lista de membros
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
    if (!confirm(`Rejeitar cadastro de ${user.name}?`)) return;
    setActing(user.uid);
    try {
      await updateDoc(doc(db, "users", user.uid), { status: "rejected" });
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
        <h1 className="text-xl font-bold text-gray-900">Aprovações</h1>
        <p className="text-gray-500 text-sm">{pending.length} cadastro{pending.length !== 1 ? "s" : ""} pendente{pending.length !== 1 ? "s" : ""}</p>
      </div>

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
                </div>

                <div className="space-y-1 text-xs text-gray-500 mb-3">
                  <div className="flex items-center gap-2">
                    <Mail size={12} /> {u.email}
                  </div>
                  {(u as any).phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={12} /> {(u as any).phone}
                    </div>
                  )}
                  {(u as any).aniversario && (
                    <div className="flex items-center gap-2">
                      <Cake size={12} /> {(u as any).aniversario}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => approve(u)}
                    disabled={acting === u.uid}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-xl font-medium text-sm hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    <Check size={15} />
                    {acting === u.uid ? "..." : "Aprovar"}
                  </button>
                  <button
                    onClick={() => reject(u)}
                    disabled={acting === u.uid}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-500 rounded-xl text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
