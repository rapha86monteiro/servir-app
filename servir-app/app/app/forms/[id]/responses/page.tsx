"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getForm, getFormResponses } from "@/lib/firestore/forms";
import type { CustomForm, FormResponse } from "@/lib/types";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function FormResponsesPage() {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<CustomForm | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [f, r] = await Promise.all([getForm(id), getFormResponses(id)]);
      setForm(f);
      setResponses(r);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!form) return <p className="text-gray-400 text-center py-20">Formulário não encontrado.</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/app/forms">
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{form.title}</h1>
          <p className="text-gray-500 text-sm">{responses.length} resposta{responses.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {responses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-gray-400 text-sm">Nenhuma resposta ainda. Compartilhe o link do formulário!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {responses.map((resp) => (
            <div key={resp.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <p className="font-semibold text-gray-900">{resp.memberName}</p>
                <p className="text-xs text-gray-400">
                  {new Date(resp.submittedAt).toLocaleDateString("pt-BR", {
                    day: "2-digit", month: "2-digit", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>
              <dl className="space-y-2">
                {form.fields.map((field) => (
                  <div key={field.id} className="grid grid-cols-3 gap-2">
                    <dt className="text-sm font-medium text-gray-500">{field.label}</dt>
                    <dd className="col-span-2 text-sm text-gray-900">
                      {field.type === "checkbox"
                        ? (resp.answers[field.id] ? "✅ Sim" : "❌ Não")
                        : String(resp.answers[field.id] ?? "-")}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
