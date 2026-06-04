"use client";

import { useEffect, useState } from "react";
import { getAvisos, type Aviso } from "@/lib/firestore/avisos";
import { Megaphone, Pin } from "lucide-react";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function MuralPage() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAvisos().then((a) => { setAvisos(a); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Mural de Avisos</h1>
        <p className="text-gray-500 text-sm">Comunicados da coordenação</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-black" />
        </div>
      ) : avisos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <Megaphone size={32} className="text-gray-200 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">Nenhum aviso publicado ainda</p>
        </div>
      ) : (
        <div className="space-y-2">
          {avisos.map((a) => (
            <div key={a.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${a.fixado ? "border-amber-300 bg-amber-50/30" : "border-gray-100"}`}>
              <div className="flex items-center gap-2 mb-1">
                {a.fixado && <Pin size={13} className="text-amber-500 flex-shrink-0" />}
                <p className="font-bold text-gray-900">{a.titulo}</p>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{a.mensagem}</p>
              <p className="text-xs text-gray-400 mt-2">{a.autor} · {formatDateTime(a.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
