"use client";

import { useEffect, useState, useRef } from "react";
import { ReportTabs } from "@/components/layout/ReportTabs";
import { notify } from "@/lib/notify";
import { getRelatorios, createRelatorio, deleteRelatorio } from "@/lib/firestore/relatorios";
import { getServices } from "@/lib/firestore/services";
import { getTeams, getTeamsByLeader } from "@/lib/firestore/teams";
import type { Relatorio, Avaliacao, Service, Team } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { Plus, Trash2, Camera, X, ChevronDown, ChevronUp } from "lucide-react";

const AVALIACOES: { value: Avaliacao; color: string; dot: string }[] = [
  { value: "Ótimo", color: "bg-green-100 text-green-700 border-green-300", dot: "bg-green-500" },
  { value: "Bom", color: "bg-blue-100 text-blue-700 border-blue-300", dot: "bg-blue-500" },
  { value: "Regular", color: "bg-yellow-100 text-yellow-700 border-yellow-300", dot: "bg-yellow-500" },
  { value: "Precisa melhorar", color: "bg-red-100 text-red-700 border-red-300", dot: "bg-red-500" },
];

const empty = {
  serviceId: "", teamId: "", presentes: 0, ausentes: 0, substitutos: 0,
  avaliacao: "Bom" as Avaliacao, observacoes: "", ocorrencias: "", fotos: [] as string[],
};

function compressImage(file: File, maxWidth = 800): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
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

export default function RelatorioPage() {
  const { appUser } = useAuth();
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, [appUser]);

  async function load() {
    if (!appUser) return;
    setLoading(true);
    const [svcs, t, rels] = await Promise.all([
      getServices(),
      appUser.role === "admin" ? getTeams() : getTeamsByLeader(appUser.uid),
      getRelatorios(),
    ]);
    setServices(svcs);
    setTeams(t);
    setRelatorios(rels);
    setLoading(false);
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (form.fotos.length + files.length > 5) {
      alert("Máximo de 5 fotos por relatório.");
      return;
    }
    const compressed = await Promise.all(files.map((f) => compressImage(f)));
    setForm((prev) => ({ ...prev, fotos: [...prev.fotos, ...compressed] }));
  }

  function removePhoto(idx: number) {
    setForm((prev) => ({ ...prev, fotos: prev.fotos.filter((_, i) => i !== idx) }));
  }

  async function handleSave() {
    if (!form.serviceId || !form.teamId) {
      alert("Selecione o culto e a equipe.");
      return;
    }
    setSaving(true);
    try {
      const service = services.find((s) => s.id === form.serviceId)!;
      const team = teams.find((t) => t.id === form.teamId)!;
      await createRelatorio({
        ...form,
        serviceTitle: service.title,
        serviceDate: service.date,
        teamName: team.name,
        liderId: appUser?.uid ?? "admin",
        liderName: appUser?.name ?? "Líder",
        createdAt: new Date().toISOString(),
      });
      setForm(empty);
      setShowForm(false);
      load();
      // Avisa coordenadores
      notify({ target: "coordinators" }, {
        title: "📝 Novo relatório enviado",
        message: `${team.name} — ${service.title} · ${form.presentes} presentes, ${form.ausentes} ausentes (${form.avaliacao})`,
        type: "relatorio", data: { url: "/app/historico" },
      });
    } catch (err) {
      alert("Erro: " + String(err));
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir relatório?")) return;
    await deleteRelatorio(id);
    load();
  }

  const avaliacaoInfo = (av: Avaliacao) => AVALIACOES.find((a) => a.value === av)!;

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
        <h1 className="text-xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-gray-500 text-sm">Relatórios, histórico e estatísticas</p>
      </div>

      <ReportTabs />

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">{relatorios.length} relatórios enviados</p>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus size={15} /> Novo
        </Button>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
          <p className="font-semibold text-gray-900">Novo Relatório de Culto</p>

          <div className="space-y-3">
            <Select label="Culto *" value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}>
              <option value="">Selecione o culto</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.title} — {formatDate(s.date)} ({s.turno})</option>
              ))}
            </Select>

            <Select label="Equipe *" value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
              <option value="">Selecione a equipe</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>

          {/* Presença */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Presença da Equipe</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-xs text-green-600 mb-1">Presentes</p>
                <input
                  type="number" min={0}
                  value={form.presentes}
                  onChange={(e) => setForm({ ...form, presentes: parseInt(e.target.value) || 0 })}
                  className="w-full text-center text-2xl font-bold text-green-700 bg-transparent focus:outline-none"
                />
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <p className="text-xs text-red-600 mb-1">Ausentes</p>
                <input
                  type="number" min={0}
                  value={form.ausentes}
                  onChange={(e) => setForm({ ...form, ausentes: parseInt(e.target.value) || 0 })}
                  className="w-full text-center text-2xl font-bold text-red-700 bg-transparent focus:outline-none"
                />
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-xs text-blue-600 mb-1">Substitutos</p>
                <input
                  type="number" min={0}
                  value={form.substitutos}
                  onChange={(e) => setForm({ ...form, substitutos: parseInt(e.target.value) || 0 })}
                  className="w-full text-center text-2xl font-bold text-blue-700 bg-transparent focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Avaliação */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Avaliação Geral</p>
            <div className="grid grid-cols-2 gap-2">
              {AVALIACOES.map(({ value, color, dot }) => (
                <button
                  key={value}
                  onClick={() => setForm({ ...form, avaliacao: value })}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    form.avaliacao === value ? color + " border-current" : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                  {value}
                </button>
              ))}
            </div>
          </div>

          {/* Observações */}
          <Textarea
            label="Observações gerais"
            value={form.observacoes}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            placeholder="Como foi o serviço?"
            rows={3}
          />

          <Textarea
            label="Ocorrências / Problemas"
            value={form.ocorrencias}
            onChange={(e) => setForm({ ...form, ocorrencias: e.target.value })}
            placeholder="Registre problemas ou situações especiais..."
            rows={3}
          />

          {/* Fotos */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Fotos <span className="text-gray-400 font-normal">({form.fotos.length}/5)</span>
            </p>
            <div className="flex gap-2 flex-wrap">
              {form.fotos.map((foto, idx) => (
                <div key={idx} className="relative w-20 h-20">
                  <img src={foto} alt="" className="w-20 h-20 object-cover rounded-xl" />
                  <button
                    onClick={() => removePhoto(idx)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              {form.fotos.length < 5 && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-blue-300 hover:text-blue-400 transition-colors"
                >
                  <Camera size={20} />
                  <span className="text-xs">Foto</span>
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handlePhoto}
              className="hidden"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Enviando..." : "Enviar Relatório"}
            </Button>
          </div>
        </div>
      )}

      {/* Lista de relatórios */}
      <div className="space-y-3">
        {relatorios.map((r) => {
          const av = avaliacaoInfo(r.avaliacao);
          const expanded = expandedId === r.id;
          return (
            <div key={r.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedId(expanded ? null : r.id)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{r.serviceTitle}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${av.color}`}>
                        {r.avaliacao}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(r.serviceDate)} · {r.teamName} · {r.liderName}
                    </p>
                    <div className="flex gap-3 mt-2">
                      <span className="text-xs text-green-600 font-semibold">{r.presentes} presentes</span>
                      <span className="text-xs text-red-500">{r.ausentes} ausentes</span>
                      <span className="text-xs text-blue-500">{r.substitutos} substitutos</span>
                      {r.fotos.length > 0 && <span className="text-xs text-gray-400">📷 {r.fotos.length}</span>}
                    </div>
                  </div>
                  {expanded ? <ChevronUp size={18} className="text-gray-400 mt-1" /> : <ChevronDown size={18} className="text-gray-400 mt-1" />}
                </div>
              </button>

              {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
                  {r.observacoes && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Observações</p>
                      <p className="text-sm text-gray-700">{r.observacoes}</p>
                    </div>
                  )}
                  {r.ocorrencias && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Ocorrências</p>
                      <p className="text-sm text-gray-700">{r.ocorrencias}</p>
                    </div>
                  )}
                  {r.fotos.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Fotos</p>
                      <div className="flex gap-2 flex-wrap">
                        {r.fotos.map((foto, idx) => (
                          <img key={idx} src={foto} alt="" className="w-20 h-20 object-cover rounded-xl" />
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={13} /> Excluir relatório
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {relatorios.length === 0 && !showForm && (
          <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
            <p className="text-gray-400 text-sm">Nenhum relatório enviado ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}
