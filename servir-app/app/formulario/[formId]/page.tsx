"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getForm, submitFormResponse } from "@/lib/firestore/forms";
import type { CustomForm } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { ChurchIcon, CheckCircle2 } from "lucide-react";

export default function FormPublicPage() {
  const { formId } = useParams<{ formId: string }>();
  const [form, setForm] = useState<CustomForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      const f = await getForm(formId);
      setForm(f);
      if (f) {
        const init: Record<string, string | boolean> = {};
        f.fields.forEach((field) => { init[field.id] = field.type === "checkbox" ? false : ""; });
        setAnswers(init);
      }
      setLoading(false);
    }
    load();
  }, [formId]);

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs["__name"] = "Informe seu nome";
    form?.fields.forEach((field) => {
      if (field.required && !answers[field.id]) {
        errs[field.id] = "Campo obrigatório";
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !form) return;
    setSubmitting(true);
    await submitFormResponse({
      formId: form.id,
      formTitle: form.title,
      memberName: name,
      answers,
      submittedAt: new Date().toISOString(),
    });
    setDone(true);
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm">
          <p className="text-gray-500">Formulário não encontrado.</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full">
          <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Resposta enviada!</h2>
          <p className="text-gray-500 text-sm">Obrigado por preencher o formulário. Suas respostas foram registradas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-start justify-center p-4 pt-12 pb-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ChurchIcon size={28} className="text-white" />
          </div>
          <h1 className="text-white text-xl font-bold">{form.title}</h1>
          <p className="text-slate-400 text-sm mt-1">{form.teamName} · Departamento Servir</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-xl space-y-4">
          <Input
            label="Seu nome completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="João da Silva"
            error={errors["__name"]}
          />

          {form.fields.map((field) => (
            <div key={field.id}>
              {field.type === "text" && (
                <Input
                  label={field.label + (field.required ? " *" : "")}
                  value={String(answers[field.id] ?? "")}
                  onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                  error={errors[field.id]}
                />
              )}
              {field.type === "textarea" && (
                <Textarea
                  label={field.label + (field.required ? " *" : "")}
                  value={String(answers[field.id] ?? "")}
                  onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                  error={errors[field.id]}
                />
              )}
              {field.type === "date" && (
                <Input
                  type="date"
                  label={field.label + (field.required ? " *" : "")}
                  value={String(answers[field.id] ?? "")}
                  onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                  error={errors[field.id]}
                />
              )}
              {field.type === "select" && (
                <Select
                  label={field.label + (field.required ? " *" : "")}
                  value={String(answers[field.id] ?? "")}
                  onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.value })}
                  error={errors[field.id]}
                >
                  <option value="">Selecione...</option>
                  {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </Select>
              )}
              {field.type === "checkbox" && (
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(answers[field.id])}
                    onChange={(e) => setAnswers({ ...answers, [field.id]: e.target.checked })}
                    className="mt-0.5 accent-blue-600 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {field.label}{field.required ? " *" : ""}
                  </span>
                </label>
              )}
            </div>
          ))}

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? "Enviando..." : "Enviar respostas"}
          </Button>
        </form>
      </div>
    </div>
  );
}
