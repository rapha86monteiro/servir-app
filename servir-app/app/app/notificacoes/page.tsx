"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";
import { Bell, BellOff, Check } from "lucide-react";
import { requestNotificationPermission, isNotificationGranted } from "@/lib/notifications";

export default function NotificacoesPage() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setEnabled(isNotificationGranted());
  }, []);

  async function handleEnable() {
    const user = auth.currentUser;
    if (!user) {
      setMsg({ ok: false, text: "Faça login novamente." });
      return;
    }
    setBusy(true);
    setMsg(null);
    const r = await requestNotificationPermission(user.uid);
    setMsg({ ok: r.ok, text: r.message });
    if (r.ok) setEnabled(true);
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Notificações</h1>
        <p className="text-gray-500 text-sm">Configure as notificações no seu dispositivo</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${enabled ? "bg-green-100" : "bg-gray-100"}`}>
            {enabled ? <Bell size={22} className="text-green-600" /> : <BellOff size={22} className="text-gray-400" />}
          </div>
          <div>
            <p className={`font-bold ${enabled ? "text-green-700" : "text-gray-900"}`}>
              {enabled ? "Notificações ativadas" : "Notificações desativadas"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {enabled
                ? "Você receberá alertas neste dispositivo."
                : "Ative para receber alertas de escalas e avisos."}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-700">📱 O que você vai receber:</p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• Nova escala criada para você</li>
            <li>• Pedidos de substituição da sua equipe</li>
            <li>• Quando alguém aceitar sua substituição</li>
            <li>• Aniversariantes do dia</li>
            <li>• Lembrete de culto (1 dia antes)</li>
            <li>• Avisos do coordenador</li>
          </ul>
        </div>

        {msg && (
          <div className={`text-sm p-3 rounded-lg flex items-center gap-2 ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {msg.ok && <Check size={14} />}
            {msg.text}
          </div>
        )}

        {!enabled && (
          <Button onClick={handleEnable} disabled={busy} className="w-full">
            <Bell size={14} /> {busy ? "Ativando..." : "Ativar notificações"}
          </Button>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <p className="text-xs font-bold text-amber-700 mb-1">⚠️ iPhone (iOS)</p>
        <p className="text-xs text-amber-600">
          Para receber notificações no iPhone, você precisa adicionar o app à tela inicial:
          abra no Safari → toque em Compartilhar → "Adicionar à Tela de Início".
        </p>
      </div>
    </div>
  );
}
