"use client";

import { useEffect, useState } from "react";
import { getForms, getFormsByTeam, createForm, deleteForm } from "@/lib/firestore/forms";
import { getTeams, getTeamsByLeader } from "@/lib/firestore/teams";
import type { CustomForm, Team, FormField, FormFieldType } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Plus, Trash2, Eye, FileText, PlusCircle, GripVertical } from "lucide-react";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: "text", label: "Texto curto" },
  { value: "textarea", label: "Texto longo" },
  { value: "select", label: "Seleção" },
  { value: "checkbox", label: "Caixa de marcação" },
  { value: "date", label: "Data" },
];

function newField(): FormField {
  return { id: uuidv4(), label: "", type: "text", required: false };
}

export default function FormsPage() {
  const { appUser } = useAuth();
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [teamId, setTeamId] = useState("");
  const [fields, setFields] = useState<FormField[]>([newField()]);

  useEffect(() => { load(); }, [appUser]);

  async function load() {
    if (!appUser) return;
    setLoading(true);
    const [t, f] = await Promise.all([
      appUser.role === "admin" ? getTeams() : getTeamsByLeader(appUser.uid),
      appUser.role === "admin" ? getForms() : Promise.all(
        appUser.teamIds.map((tid) => getFormsByTeam(tid))
      ).then((r) => r.flat()),
    ]);
    setTeams(t);
    setForms(f);
    setLoading(false);
  }

  function addField() {
    setFields((prev) => [...prev, newField()]);
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  function updateField(id: string, patch: Partial<FormField>) {
    setFields((prev) => prev.map((f) => f.id === id ? { ...f, ...patch } : f));
  }

  async function handleCreate() {
    if (!title.trim() || !teamId) return;
    const team = teams.find((t) => t.id === teamId)!;
    await createForm({
      title,
      teamId,
      teamName: team.name,
      fields,
      createdBy: appUser?.uid ?? "admin",
      createdAt: new Date().toISOString(),
    });
    setModalOpen(false);
    setTitle(""); setTeamId(""); setFields([newField()]);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir formulário?")) return;
    await deleteForm(id);
    load();
  }

  function getFormUrl(id: string) {
    return `${typeof window !== "undefined" ? window.location.origin : ""}/formulario/${id}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Formulários</h1>
          <p className="text-gray-500 text-sm mt-1">{forms.length} formulários criados</p>
        </div>
        <Button onClick={() => setModalOpen(true)}><Plus size={16} /> Novo Formulário</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {forms.map((f) => (
            <div key={f.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                    <FileText size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{f.title}</p>
                    <p className="text-xs text-gray-400">{f.teamName} · {f.fields.length} campos</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(f.id)} className="p-1 text-gray-400 hover:text-red-600 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex gap-2 mt-3">
                <Link href={`/app/forms/${f.id}/responses`} className="flex-1">
                  <Button variant="secondary" size="sm" className="w-full">
                    <Eye size={13} /> Respostas
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                  onClick={() => {
                    const url = getFormUrl(f.id);
                    const text = `Responda o formulário *${f.title}*: ${url}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                  }}
                >
                  Compartilhar
                </Button>
              </div>
            </div>
          ))}
          {forms.length === 0 && (
            <p className="text-gray-400 text-sm col-span-2 text-center py-12">Nenhum formulário criado.</p>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Formulário" size="lg">
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Título do formulário" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Cadastro de Membro" />
            <Select label="Equipe" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">Selecione</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Campos do formulário</p>
              <button onClick={addField} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                <PlusCircle size={14} /> Adicionar campo
              </button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {fields.map((field, i) => (
                <div key={field.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <GripVertical size={14} className="text-gray-300" />
                    <span className="text-xs text-gray-400 font-mono">#{i + 1}</span>
                    <Input
                      placeholder="Rótulo do campo"
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      className="flex-1"
                    />
                    <button onClick={() => removeField(field.id)} className="p-1 text-gray-400 hover:text-red-500">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 pl-6">
                    <Select value={field.type} onChange={(e) => updateField(field.id, { type: e.target.value as FormFieldType })} className="flex-1">
                      {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </Select>
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap">
                      <input type="checkbox" checked={field.required} onChange={(e) => updateField(field.id, { required: e.target.checked })} className="accent-blue-600" />
                      Obrigatório
                    </label>
                  </div>
                  {field.type === "select" && (
                    <div className="pl-6">
                      <Input
                        placeholder="Opções separadas por vírgula: Sim, Não, Talvez"
                        value={field.options?.join(", ") ?? ""}
                        onChange={(e) => updateField(field.id, { options: e.target.value.split(",").map((o) => o.trim()) })}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!title || !teamId}>Criar Formulário</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
