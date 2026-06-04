import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { AllProfilesPermissions, Funcao, ModuleKey, ProfilePermissions } from "./types";

export const MODULES: { key: ModuleKey; label: string }[] = [
  { key: "dashboard", label: "Início" },
  { key: "calendario", label: "Calendário" },
  { key: "schedules", label: "Escalas" },
  { key: "substituicoes", label: "Substituições" },
  { key: "members", label: "Membros" },
  { key: "relatorio", label: "Relatórios" },
  { key: "historico", label: "Histórico" },
  { key: "forms", label: "Formulários" },
  { key: "teams", label: "Equipes" },
  { key: "aprovacoes", label: "Aprovações" },
  { key: "perfis", label: "Perfis" },
  { key: "avisos", label: "Avisos" },
];

const ALL_TRUE: ProfilePermissions = {
  dashboard: { view: true, edit: true },
  calendario: { view: true, edit: true },
  schedules: { view: true, edit: true },
  substituicoes: { view: true, edit: true },
  members: { view: true, edit: true },
  relatorio: { view: true, edit: true },
  historico: { view: true, edit: true },
  forms: { view: true, edit: true },
  teams: { view: true, edit: true },
  aprovacoes: { view: true, edit: true },
  perfis: { view: true, edit: true },
  avisos: { view: true, edit: true },
};

const VIEW_ONLY: ProfilePermissions = {
  dashboard: { view: true, edit: false },
  calendario: { view: true, edit: false },
  schedules: { view: true, edit: false },
  substituicoes: { view: true, edit: true },
  members: { view: true, edit: false },
  relatorio: { view: false, edit: false },
  historico: { view: false, edit: false },
  forms: { view: false, edit: false },
  teams: { view: false, edit: false },
  aprovacoes: { view: false, edit: false },
  perfis: { view: false, edit: false },
  avisos: { view: false, edit: false },
};

export const DEFAULT_PERMISSIONS: AllProfilesPermissions = {
  Coordenador: ALL_TRUE,
  Líder: {
    ...ALL_TRUE,
    teams: { view: true, edit: false },
    aprovacoes: { view: false, edit: false },
    perfis: { view: false, edit: false },
    avisos: { view: false, edit: false },
  },
  "Co-líder": {
    dashboard: { view: true, edit: false },
    calendario: { view: true, edit: false },
    schedules: { view: true, edit: true },
    substituicoes: { view: true, edit: true },
    members: { view: true, edit: true },
    relatorio: { view: true, edit: true },
    historico: { view: true, edit: false },
    forms: { view: true, edit: false },
    teams: { view: false, edit: false },
    aprovacoes: { view: false, edit: false },
    perfis: { view: false, edit: false },
    avisos: { view: false, edit: false },
  },
  Voluntário: VIEW_ONLY,
};

export async function getProfilePermissions(): Promise<AllProfilesPermissions> {
  try {
    const snap = await getDoc(doc(db, "config", "permissions"));
    if (snap.exists()) {
      const saved = snap.data() as Partial<AllProfilesPermissions>;
      // Merge profundo: garante que toda função tenha todos os módulos
      const result = {} as AllProfilesPermissions;
      (Object.keys(DEFAULT_PERMISSIONS) as Funcao[]).forEach((funcao) => {
        const defaultPerms = DEFAULT_PERMISSIONS[funcao];
        const savedPerms = saved[funcao] ?? {};
        const merged = {} as any;
        MODULES.forEach(({ key }) => {
          merged[key] = (savedPerms as any)[key] ?? defaultPerms[key] ?? { view: false, edit: false };
        });
        result[funcao] = merged;
      });
      return result;
    }
  } catch {}
  return DEFAULT_PERMISSIONS;
}

export async function saveProfilePermissions(perms: AllProfilesPermissions) {
  await setDoc(doc(db, "config", "permissions"), perms);
}

export function can(
  perms: AllProfilesPermissions | null,
  funcao: Funcao | undefined,
  module: ModuleKey,
  action: "view" | "edit" = "view"
): boolean {
  if (!perms) return true;
  if (!funcao) funcao = "Voluntário";
  const p = perms[funcao]?.[module];
  if (!p) return false;
  return action === "edit" ? p.edit : p.view;
}
