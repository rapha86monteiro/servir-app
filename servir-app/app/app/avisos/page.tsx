"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { notify } from "@/lib/notify";
import { Megaphone, Check } from "lucide-react";

export default function AvisosPage() {
  const { appUser } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const isAdmin = appUser?.role === "admin" || appUser?.funcao === "Coordenador";

  useEffect(() => {
    if (appUser && !isAdmin) router.push("/app/dashboard");
  }, [appUser]);

  async function handleSend() {
    if (!title.trim() || !message.trim()) {
      setResult({ ok: false, text: "Preencha título e mensagem." });
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const res = await notify(
        { target: "all" },
        { title: `📢 ${title}`, message, type: "announcement", data: { url: "/app/dashboard" } }
      );
      if (res.error) {
        setResult({ ok: false, text: "Erro: " + res.error });
      } else {
        setResult({ ok: true, text: `Aviso enviado! ${res.success ?? 0} dispositivo(s) notificado(s).` });
        setTitle(""); setMessage("");
      }
    } catch (err) {
      setResult({ ok: false, text: "Erro: " + String(err) });
    }
    setSending(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Avisos</h1>
        <p className="text-gray-500 text-sm">Envie uma mensagem para todos os membros aprovados</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Megaphone size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900">Novo Aviso</p>
            <p className="text-xs text-gray-400">Será enviado como notificação push</p>
          </div>
        </div>

        <Input
          label="Título *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Reunião extraordinária"
          maxLength={50}
        />

        <Textarea
          label="Mensagem *"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Conteúdo do aviso..."
          rows={5}
        />

        {result && (
          <div className={`text-sm p-3 rounded-lg flex items-center gap-2 ${result.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {result.ok && <Check size={14} />}
            {result.text}
          </div>
        )}

        <Button onClick={handleSend} disabled={sending} className="w-full">
          {sending ? "Enviando..." : "Enviar para todos"}
        </Button>
      </div>
    </div>
  );
}
