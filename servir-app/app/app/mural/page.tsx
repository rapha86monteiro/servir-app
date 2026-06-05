"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { notify } from "@/lib/notify";
import { getAvisos, createAviso, toggleFixarAviso, deleteAviso, type Aviso } from "@/lib/firestore/avisos";
import { Megaphone, Check, Pin, PinOff, Trash2, Plus, ImagePlus, X } from "lucide-react";

function compressImage(file: File, maxWidth = 1000): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = Math.min(maxWidth / img.width, 1);
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

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function MuralPage() {
  const { appUser } = useAuth();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [fixar, setFixar] = useState(false);
  const [imagem, setImagem] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isAdmin = appUser?.role === "admin" || appUser?.funcao === "Coordenador";

  async function handleImagem(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagem(await compressImage(file));
  }

  useEffect(() => { load(); }, []);

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
      await createAviso({
        titulo: title,
        mensagem: message,
        autor: appUser?.name ?? "Coordenação",
        fixado: fixar,
        imagem: imagem || "",
        createdAt: new Date().toISOString(),
      });
      const res = await notify(
        { target: "all" },
        { title: `📢 ${title}`, message, type: "announcement", data: { url: "/app/mural" } }
      );
      const pushInfo = res.error ? "(push não enviado)" : `${res.success ?? 0} notificados`;
      setResult({ ok: true, text: `Aviso publicado! ${pushInfo}` });
      setTitle(""); setMessage(""); setFixar(false); setImagem(""); setShowForm(false);
      load();
    } catch (err: any) {
      setResult({ ok: false, text: "Erro: " + (err?.message ?? String(err)) });
    }
    setSending(false);
  }

  async function handleFixar(a: Aviso) { await toggleFixarAviso(a.id, !a.fixado); load(); }
  async function handleDelete(id: string) {
    if (!confirm("Excluir este aviso?")) return;
    await deleteAviso(id); load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mural de Avisos</h1>
          <p className="text-gray-500 text-sm">Comunicados da coordenação</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus size={15} /> Novo Aviso
          </Button>
        )}
      </div>

      {/* Formulário (admin) */}
      {isAdmin && showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Megaphone size={18} className="text-amber-500" />
            <p className="font-bold text-gray-900">Novo Aviso</p>
          </div>
          <Input label="Título *" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Reunião extraordinária" maxLength={60} />
          <Textarea label="Mensagem *" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Conteúdo do aviso..." rows={4} />

          {/* Imagem */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Imagem (opcional)</p>
            {imagem ? (
              <div className="relative w-full">
                <img src={imagem} alt="" className="w-full max-h-60 object-contain rounded-xl bg-gray-50" />
                <button
                  onClick={() => setImagem("")}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
              >
                <ImagePlus size={18} /> Anexar imagem
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImagem} className="hidden" />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={fixar} onChange={(e) => setFixar(e.target.checked)} className="w-4 h-4 accent-black" />
            <span className="text-sm text-gray-700 flex items-center gap-1"><Pin size={13} /> Fixar no topo</span>
          </label>
          {result && (
            <div className={`text-sm p-3 rounded-lg flex items-center gap-2 ${result.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {result.ok && <Check size={14} />}{result.text}
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSend} disabled={sending}>{sending ? "Publicando..." : "Publicar e Notificar"}</Button>
          </div>
        </div>
      )}

      {/* Feed */}
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
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {a.fixado && <Pin size={13} className="text-amber-500 flex-shrink-0" />}
                    <p className="font-bold text-gray-900">{a.titulo}</p>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{a.mensagem}</p>
                  {a.imagem && (
                    <img src={a.imagem} alt="" className="w-full max-h-80 object-contain rounded-xl bg-gray-50 mt-2" />
                  )}
                  <p className="text-xs text-gray-400 mt-2">{a.autor} · {formatDateTime(a.createdAt)}</p>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => handleFixar(a)} className="p-1.5 text-gray-400 hover:text-amber-500">
                      {a.fixado ? <PinOff size={14} /> : <Pin size={14} />}
                    </button>
                    <button onClick={() => handleDelete(a.id)} className="p-1.5 text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
