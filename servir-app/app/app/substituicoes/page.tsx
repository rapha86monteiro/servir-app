"use client";

import { useEffect, useState } from "react";
import { getSubstituicoesAbertas, aceitarSubstituicaoCompleta, cancelarSubstituicao } from "@/lib/firestore/substituicoes";
import { getMembers } from "@/lib/firestore/members";
import { getTeams } from "@/lib/firestore/teams";
import type { Substituicao, Member, Team } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { formatDate } from "@/lib/utils";
import { RefreshCw, CheckCircle2, X } from "lucide-react";

const TURNO_COLORS: Record<string, string> = {
  "Manhã": "bg-yellow-100 text-yellow-700",
  "Tarde": "bg-orange-100 text-orange-700",
  "Noite": "bg-blue-100 text-blue-700",
  "Especial": "bg-purple-100 text-purple-700",
};

export default function SubstituicoesPage() {
  const { appUser } = useAuth();
  const [substituicoes, setSubstituicoes] = useState<Substituicao[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [myMemberId, setMyMemberId] = useState<string | null>(null);

  useEffect(() => { load(); }, [appUser]);

  async function load() {
    if (!appUser) return;
    setLoading(true);

    const uid = auth.currentUser?.uid ?? appUser.uid;
    const [subs, allMembers, allTeams] = await Promise.all([
      getSubstituicoesAbertas(),
      getMembers(),
      getTeams(),
    ]);
    setSubstituicoes(subs);
    setMembers(allMembers);
    setTeams(allTeams);

    // Acha meu registro de membro pelo uid
    const meu = allMembers.find((m) => m.uid === uid);
    if (meu) setMyMemberId(meu.id);

    setLoading(false);
  }

  async function handleAceitar(sub: Substituicao) {
    if (!appUser) return;
    setActing(sub.id);
    try {
      const uid = auth.currentUser?.uid ?? appUser.uid;
      // Encontra o registro de membro de quem está aceitando
      const meuMembro = members.find((m) => m.uid === uid);
      const memberId = meuMembro?.id ?? uid;
      const name = meuMembro?.name ?? appUser.name;
      const teamName = teams.find((t) => t.id === meuMembro?.teamId)?.name ?? "";

      await aceitarSubstituicaoCompleta(sub, { memberId, name, teamName });
      alert(`Você assumiu o lugar de ${sub.membroName} em ${sub.position}! ✅`);
      load();
    } catch (err) {
      alert("Erro: " + String(err));
    }
    setActing(null);
  }

  async function handleCancelar(id: string) {
    if (!confirm("Cancelar pedido de substituição?")) return;
    setActing(id);
    await cancelarSubstituicao(id);
    load();
    setActing(null);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Substituições</h1>
        <p className="text-gray-500 text-sm">{substituicoes.length} pedido{substituicoes.length !== 1 ? "s" : ""} em aberto</p>
      </div>

      {substituicoes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <RefreshCw size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Nenhum pedido de substituição em aberto.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {substituicoes.map((sub) => {
            const isMyRequest = sub.membroId === myMemberId || sub.membroId === appUser?.uid;
            return (
              <div key={sub.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-bold text-gray-900">{sub.membroName}</span>
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                        Precisa de substituto
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-gray-400 mb-2">
                      <span>{sub.serviceTitle}</span>
                      <span>·</span>
                      <span>{formatDate(sub.serviceDate)}</span>
                      <span className={`px-1.5 py-0.5 rounded-full font-medium ${TURNO_COLORS[sub.serviceTurno] ?? "bg-gray-100 text-gray-600"}`}>
                        {sub.serviceTurno}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{sub.teamName}</span>
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">📍 {sub.position}</span>
                    </div>
                    {sub.justification && (
                      <p className="text-xs text-gray-400 mt-2 italic">"{sub.justification}"</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                  {isMyRequest ? (
                    <button
                      onClick={() => handleCancelar(sub.id)}
                      disabled={acting === sub.id}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm border border-red-200 text-red-500 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <X size={14} /> Cancelar pedido
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAceitar(sub)}
                      disabled={acting === sub.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#0a0a0a] text-white rounded-xl font-medium text-sm hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} />
                      {acting === sub.id ? "Aceitando..." : "Aceitar e servir no lugar"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
