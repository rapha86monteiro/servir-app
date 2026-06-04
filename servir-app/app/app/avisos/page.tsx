"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { notify } from "@/lib/notify";
import { getAvisos, createAviso, toggleFixarAviso, deleteAviso, type Aviso } from "@/lib/firestore/avisos";
import { Megaphone, Check, Pin, PinOff, Trash2 } from "lucide-react";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AvisosPage() {
  const { appUser } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [fixar, setFixar] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = appUser?.role === "admin" || appUser?.funcao === "Coordenador";

  useEffect(() => {
    if (appUser && !isAdmin) router.push("/app/dashboard");
    load();
  }, [appUser]);

  async function load() {
    setLoading(true);
    setAvisos(await getAvisos().catch(() => []));
    setLoading(false);
  }

  async function handleSend() {
    if (!title.trim() || !message.trim()) {
      setResult({ ok: false, text: "Preencha título e mensagem." });
      return;
    }
    setSending(true);
    setResult(null);
    try {
      // 1. Salva no mural
      await createAviso({
        titulo: title,
        mensagem: message,
        autor: appUser?.name ?? "Coordenação",
        fixado: fixar,
        createdAt: new Date().toISOString(),
      });

      // 2. Envia push
      const res = await notify(
        { target: "all" },
        { title: `📢 ${title}`, message, type: "announcement", data: { url: "/app/dashboard" } }
      );

      const pushInfo = res.error
        ? "(push não enviado — ninguém com notificações ativas)"
        : `${res.success ?? 0} notificados`;
      setResult({ ok: true, text: `Aviso publicado no mural! ${pushInfo}` });
      setTitle(""); setMessage(""); setFixar(false);
      load();
    } catch (err: any) {
      setResult({ ok: false, text: "Erro: " + (err?.message ?? String(err)) });
    }
    setSending(false);
  }

  async function handleFixar(a: Aviso) {
    await toggleFixarAviso(a.id, !a.fixado);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este aviso?")) return;
    await deleteAviso(id);
    load();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Avisos</h1>
        <p className="text-gray-500 text-sm">Publique no mural e envie notificação a todos</p>
      </div>

      {/* Novo aviso */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Megaphone size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900">Novo Aviso</p>
            <p className="text-xs text-gray-400">Vai para o mural + notificação push</p>
          </div>
        </div>

        <Input label="Título *" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Reunião extraordinária" maxLength={60} />
        <Textarea label="Mensagem *" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Conteúdo do aviso..." rows={4} />

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={fixar} onChange={(e) => setFixar(e.target.checked)} className="w-4 h-4 accent-black" />
          <span className="text-sm text-gray-700 flex items-center gap-1"><Pin size={13} /> Fixar no topo do mural</span>
        </label>

        {result && (
          <div className={`text-sm p-3 rounded-lg flex items-center gap-2 ${result.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {result.ok && <Check size={14} />}{result.text}
          </div>
        )}

        <Button onClick={handleSend} disabled={sending} className="w-full">
          {sending ? "Publicando..." : "Publicar e Notificar"}
        </Button>
      </div>

      {/* Mural */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Mural de Avisos</p>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-4 border-gray-300 border-t-black" />
          </div>
        ) : avisos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="text-gray-400 text-sm">Nenhum aviso publicado ainda</p>
          </div>
        ) : (
          <div className="space-y-2">
            {avisos.map((a) => (
              <div key={a.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${a.fixado ? "border-amber-300" : "border-gray-100"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {a.fixado && <Pin size={13} className="text-amber-500 flex-shrink-0" />}
                      <p className="font-bold text-gray-900">{a.titulo}</p>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{a.mensagem}</p>
                    <p className="text-xs text-gray-400 mt-2">{a.autor} · {formatDateTime(a.createdAt)}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => handleFixar(a)} className="p-1.5 text-gray-400 hover:text-amber-500" title={a.fixado ? "Desafixar" : "Fixar"}>
                      {a.fixado ? <PinOff size={14} /> : <Pin size={14} />}
                    </button>
                    <button onClick={() => handleDelete(a.id)} className="p-1.5 text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
