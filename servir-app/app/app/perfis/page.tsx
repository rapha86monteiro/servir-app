"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { DEFAULT_PERMISSIONS, MODULES, getProfilePermissions, saveProfilePermissions } from "@/lib/permissions";
import type { AllProfilesPermissions, Funcao, ModuleKey } from "@/lib/types";
import { Crown, Shield, User, Save, RotateCcw, Eye, Pencil, Check } from "lucide-react";

const FUNCOES: Funcao[] = ["Coordenador", "Líder", "Co-líder", "Voluntário"];

const FUNCAO_CONFIG: Record<Funcao, { color: string; icon: any; desc: string }> = {
  "Coordenador": { color: "bg-purple-500", icon: Crown, desc: "Visão geral completa" },
  "Líder": { color: "bg-blue-500", icon: Shield, desc: "Visão parcial — gerencia equipe" },
  "Co-líder": { color: "bg-cyan-500", icon: Shield, desc: "Apoio ao líder" },
  "Voluntário": { color: "bg-green-500", icon: User, desc: "Acesso limitado" },
};

export default function PerfisPage() {
  const { appUser } = useAuth();
  const router = useRouter();
  const [perms, setPerms] = useState<AllProfilesPermissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeProfile, setActiveProfile] = useState<Funcao>("Voluntário");
  const [savedMsg, setSavedMsg] = useState(false);

  const isAdmin = appUser?.role === "admin" || appUser?.funcao === "Coordenador";

  useEffect(() => {
    if (appUser && !isAdmin) router.push("/app/dashboard");
    load();
  }, [appUser]);

  async function load() {
    setLoading(true);
    const p = await getProfilePermissions();
    setPerms(p);
    setLoading(false);
  }

  function togglePerm(funcao: Funcao, mod: ModuleKey, action: "view" | "edit") {
    setPerms((prev) => {
      const cur = prev[funcao]?.[mod] ?? { view: false, edit: false };
      const newVal = !cur[action];
      const updated = { ...cur, [action]: newVal };
      // Se desligar view, edit também desliga
      if (action === "view" && !newVal) updated.edit = false;
      // Se ligar edit, view também liga
      if (action === "edit" && newVal) updated.view = true;
      return { ...prev, [funcao]: { ...prev[funcao], [mod]: updated } };
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveProfilePermissions(perms);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2500);
    } catch (err) {
      alert("Erro: " + String(err));
    }
    setSaving(false);
  }

  function resetDefaults() {
    if (!confirm("Restaurar permissões padrão?")) return;
    setPerms(DEFAULT_PERMISSIONS);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-black" />
      </div>
    );
  }

  const cfg = FUNCAO_CONFIG[activeProfile];
  const Icon = cfg.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Perfis e Permissões</h1>
          <p className="text-gray-500 text-sm">Configure o que cada perfil pode ver e editar</p>
        </div>
      </div>

      {/* Seletor de perfil */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {FUNCOES.map((f) => {
          const c = FUNCAO_CONFIG[f];
          const I = c.icon;
          return (
            <button
              key={f}
              onClick={() => setActiveProfile(f)}
              className={`p-3 rounded-2xl border-2 transition-all text-left ${
                activeProfile === f
                  ? "border-black bg-gray-50"
                  : "border-gray-100 bg-white hover:border-gray-200"
              }`}
            >
              <div className={`w-8 h-8 ${c.color} rounded-lg flex items-center justify-center mb-2`}>
                <I size={16} className="text-white" />
              </div>
              <p className="text-sm font-bold text-gray-900">{f}</p>
              <p className="text-[10px] text-gray-400 leading-tight">{c.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Permissões do perfil ativo */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className={`${cfg.color} p-4 flex items-center gap-3 text-white`}>
          <Icon size={20} />
          <div>
            <p className="font-bold">{activeProfile}</p>
            <p className="text-xs text-white/70">{cfg.desc}</p>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Módulo</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600 w-24">
                <div className="flex items-center justify-center gap-1">
                  <Eye size={12} /> Ver
                </div>
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-600 w-24">
                <div className="flex items-center justify-center gap-1">
                  <Pencil size={12} /> Editar
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {MODULES.map(({ key, label }) => {
              const p = perms[activeProfile]?.[key] ?? { view: false, edit: false };
              return (
                <tr key={key} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{label}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => togglePerm(activeProfile, key, "view")}
                      className={`w-10 h-6 rounded-full transition-colors relative ${p.view ? "bg-green-500" : "bg-gray-200"}`}
                    >
                      <span className={`absolute top-0.5 ${p.view ? "right-0.5" : "left-0.5"} w-5 h-5 bg-white rounded-full transition-all shadow`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => togglePerm(activeProfile, key, "edit")}
                      disabled={!p.view}
                      className={`w-10 h-6 rounded-full transition-colors relative ${p.edit ? "bg-blue-500" : "bg-gray-200"} ${!p.view ? "opacity-30 cursor-not-allowed" : ""}`}
                    >
                      <span className={`absolute top-0.5 ${p.edit ? "right-0.5" : "left-0.5"} w-5 h-5 bg-white rounded-full transition-all shadow`} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Ações */}
      <div className="flex gap-2 sticky bottom-20 md:bottom-0">
        <Button variant="secondary" onClick={resetDefaults} className="flex-1">
          <RotateCcw size={14} /> Padrão
        </Button>
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {savedMsg ? <><Check size={14} /> Salvo!</> : saving ? "Salvando..." : <><Save size={14} /> Salvar</>}
        </Button>
      </div>
    </div>
  );
}
