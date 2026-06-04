"use client";

import { useEffect, useState } from "react";
import { getServices, createService, updateService, deleteService } from "@/lib/firestore/services";
import type { Service } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, CalendarDays } from "lucide-react";
import { formatDate } from "@/lib/utils";

const empty = { title: "", date: "" };

export default function ServicesPage() {
  const { appUser } = useAuth();
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (appUser && appUser.role !== "admin") router.push("/app/dashboard");
    load();
  }, [appUser]);

  async function load() {
    setLoading(true);
    setServices(await getServices());
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setModalOpen(true);
  }

  function openEdit(s: Service) {
    setEditing(s);
    setForm({ title: s.title, date: s.date });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.date) return;
    if (editing) {
      await updateService(editing.id, form);
    } else {
      await createService({ ...form, createdBy: appUser!.uid });
    }
    setModalOpen(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este culto?")) return;
    await deleteService(id);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cultos</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie os cultos e eventos</p>
        </div>
        <Button onClick={openCreate}><Plus size={16} /> Novo Culto</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-2">
          {services.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                  <CalendarDays size={22} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{s.title}</p>
                  <p className="text-sm text-gray-400">{formatDate(s.date)}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors">
                  <Pencil size={15} />
                </button>
                <button onClick={() => handleDelete(s.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
          {services.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-12">Nenhum culto cadastrado ainda.</p>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar Culto" : "Novo Culto"} size="sm">
        <div className="space-y-4">
          <Input label="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Culto de Domingo" />
          <Input label="Data" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
