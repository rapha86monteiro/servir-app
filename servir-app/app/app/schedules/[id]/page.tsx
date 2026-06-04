"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSchedule, updateSchedule } from "@/lib/firestore/schedules";
import type { Schedule } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Share2, Copy, CheckCircle2, XCircle, Clock } from "lucide-react";
import Link from "next/link";

export default function ScheduleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const s = await getSchedule(id);
      setSchedule(s);
      setLoading(false);
    }
    load();
  }, [id]);

  function getPublicUrl() {
    return `${window.location.origin}/confirmar/${schedule?.publicToken}`;
  }

  async function copyLink() {
    await navigator.clipboard.writeText(getPublicUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp() {
    const url = getPublicUrl();
    const text = `Olá! Você está na escala *${schedule?.teamName}* para o culto *${schedule?.serviceTitle}* em ${formatDate(schedule?.serviceDate ?? "")}.%0AConfirme sua presença: ${url}`;
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!schedule) return <p className="text-center py-20 text-gray-400">Escala não encontrada.</p>;

  const confirmed = schedule.slots.filter((s) => s.confirmed === true);
  const declined = schedule.slots.filter((s) => s.confirmed === false);
  const pending = schedule.slots.filter((s) => s.confirmed === null);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/app/schedules">
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{schedule.teamName}</h1>
          <p className="text-gray-500 text-sm">{schedule.serviceTitle} · {formatDate(schedule.serviceDate)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{confirmed.length}</p>
          <p className="text-xs text-green-600 mt-0.5">Confirmados</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-700">{pending.length}</p>
          <p className="text-xs text-amber-600 mt-0.5">Pendentes</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-red-700">{declined.length}</p>
          <p className="text-xs text-red-600 mt-0.5">Declinados</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="font-semibold text-gray-900">Link de confirmação</p>
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3 text-sm text-gray-600 break-all">
          <span className="flex-1">{typeof window !== "undefined" ? getPublicUrl() : "..."}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={copyLink}>
            <Copy size={14} /> {copied ? "Copiado!" : "Copiar link"}
          </Button>
          <Button size="sm" onClick={shareWhatsApp} className="bg-green-600 hover:bg-green-700 focus:ring-green-500">
            <Share2 size={14} /> Compartilhar no WhatsApp
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="font-semibold text-gray-900">Membros escalados ({schedule.slots.length})</p>
        </div>
        <ul className="divide-y divide-gray-50">
          {schedule.slots.map((slot) => (
            <li key={slot.memberId} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{slot.memberName}</p>
                {slot.role && <p className="text-xs text-gray-400">{slot.role}</p>}
                {slot.justification && (
                  <p className="text-xs text-red-500 mt-0.5">"{slot.justification}"</p>
                )}
              </div>
              {slot.confirmed === true && (
                <Badge variant="green"><CheckCircle2 size={12} className="inline mr-1" />Confirmado</Badge>
              )}
              {slot.confirmed === false && (
                <Badge variant="red"><XCircle size={12} className="inline mr-1" />Declinado</Badge>
              )}
              {slot.confirmed === null && (
                <Badge variant="yellow"><Clock size={12} className="inline mr-1" />Pendente</Badge>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
