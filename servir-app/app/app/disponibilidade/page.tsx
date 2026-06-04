"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase";
import { getMinhasIndisponibilidades, addIndisponibilidade, removeIndisponibilidade } from "@/lib/firestore/disponibilidade";
import { getMembers } from "@/lib/firestore/members";
import type { Indisponibilidade } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CalendarX, Plus, Trash2, Info } from "lucide-react";

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

export default function DisponibilidadePage() {
  const { appUser } = useAuth();
  const [items, setItems] = useState<Indisponibilidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [appUser]);

  async function load() {
    const uid = auth.currentUser?.uid ?? appUser?.uid;
    if (!uid) return;
    setLoading(true);
    const list = await getMinhasIndisponibilidades(uid).catch(() => []);
    // Mostra só datas futuras
    const hoje = new Date().toISOString().split("T")[0];
    setItems(list.filter((i) => i.date >= hoje));
    setLoading(false);
  }

  async function handleAdd() {
    const uid = auth.currentUser?.uid ?? appUser?.uid;
    if (!uid || !date) return;
    setSaving(true);
    try {
      // Busca o nome/memberId do usuário
      const members = await getMembers().catch(() => []);
      const meu = members.find((m) => m.uid === uid);
      await addIndisponibilidade({
        memberId: meu?.id ?? uid,
        memberName: meu?.name ?? appUser?.name ?? "",
        uid,
        date,
        motivo,
        createdAt: new Date().toISOString(),
      });
      setDate(""); setMotivo("");
      load();
    } catch (err) {
      alert("Erro: " + String(err));
    }
    setSaving(false);
  }

  async function handleRemove(id: string) {
    await removeIndisponibilidade(id);
    load();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Minha Disponibilidade</h1>
        <p className="text-gray-500 text-sm">Marque os dias que você NÃO pode servir</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-start gap-2">
        <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          Ao marcar uma data, seu líder verá que você não está disponível e evitará te escalar nesse dia.
        </p>
      </div>

      {/* Adicionar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="font-semibold text-gray-900 text-sm">Adicionar data indisponível</p>
        <Input label="Data" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input label="Motivo (opcional)" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex: Viagem, trabalho..." />
        <Button onClick={handleAdd} disabled={saving || !date} className="w-full">
          <Plus size={15} /> {saving ? "Salvando..." : "Marcar indisponível"}
        </Button>
      </div>

      {/* Lista */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Próximas datas indisponíveis</p>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-4 border-gray-300 border-t-black" />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <CalendarX size={28} className="text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Você está disponível para todos os cultos 🙌</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((i) => (
              <div key={i.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                    <CalendarX size={18} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 capitalize">{formatDate(i.date)}</p>
                    {i.motivo && <p className="text-xs text-gray-400">{i.motivo}</p>}
                  </div>
                </div>
                <button onClick={() => handleRemove(i.id)} className="p-1.5 text-gray-400 hover:text-red-500">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
