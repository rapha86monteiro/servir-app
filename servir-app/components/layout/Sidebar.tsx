"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  CalendarDays,
  ClipboardList,
  FileText,
  LogOut,
  ClipboardCheck,
  History,
  Calendar,
  UserCog,
  MoreHorizontal,
  X,
  RefreshCw,
  User,
  Settings,
  UserCheck2,
  ShieldCheck,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import { getProfilePermissions, can } from "@/lib/permissions";
import type { AllProfilesPermissions, ModuleKey } from "@/lib/types";

const navItems: { href: string; label: string; icon: any; module: ModuleKey }[] = [
  { href: "/app/dashboard", label: "Início", icon: LayoutDashboard, module: "dashboard" },
  { href: "/app/calendario", label: "Calendário", icon: Calendar, module: "calendario" },
  { href: "/app/schedules", label: "Escalas", icon: ClipboardList, module: "schedules" },
  { href: "/app/substituicoes", label: "Substituições", icon: RefreshCw, module: "substituicoes" },
  { href: "/app/members", label: "Membros", icon: UserCheck, module: "members" },
  { href: "/app/relatorio", label: "Relatórios", icon: ClipboardCheck, module: "relatorio" },
  { href: "/app/historico", label: "Histórico", icon: History, module: "historico" },
  { href: "/app/forms", label: "Formulários", icon: FileText, module: "forms" },
  { href: "/app/avisos", label: "Avisos", icon: Megaphone, module: "avisos" },
  { href: "/app/aprovacoes", label: "Aprovações", icon: UserCheck2, module: "aprovacoes" },
  { href: "/app/teams", label: "Equipes", icon: Users, module: "teams" },
  { href: "/app/perfis", label: "Perfis", icon: ShieldCheck, module: "perfis" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { appUser } = useAuth();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [perms, setPerms] = useState<AllProfilesPermissions | null>(null);

  useEffect(() => {
    getProfilePermissions().then(setPerms);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    document.cookie = "firebase-token=; Max-Age=0; path=/";
    router.push("/login");
  };

  const role = appUser?.role ?? "member";
  const funcao = appUser?.funcao ?? (role === "admin" ? "Coordenador" : "Voluntário");
  const visibleItems = navItems.filter((item) => can(perms, funcao, item.module, "view"));

  return (
    <>
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-64 bg-[#0a0a0a] text-white flex-col h-screen sticky top-0">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
            <Image src="/logo.png" alt="Belém Church" width={36} height={36} className="object-contain" />
          </div>
          <div>
            <p className="font-bold text-sm text-white">Belém Church</p>
            <p className="text-white/40 text-xs font-semibold tracking-widest">SERVIR</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                pathname.startsWith(href)
                  ? "bg-white text-black"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs text-white/30">Logado como</p>
            <p className="text-sm font-medium text-white truncate">{appUser?.name}</p>
            <span className="text-xs text-white/40">{appUser?.role === "admin" ? "Administrador" : "Líder"}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut size={17} />
            Sair
          </button>
        </div>
      </aside>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex">
        {visibleItems.slice(0, 4).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMoreOpen(false)}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors",
              pathname.startsWith(href) ? "text-black" : "text-gray-400"
            )}
          >
            <Icon size={20} />
            <span className="text-[10px]">{label}</span>
          </Link>
        ))}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className={cn(
            "flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors",
            moreOpen ? "text-black" : "text-gray-400"
          )}
        >
          {moreOpen ? <X size={20} /> : <MoreHorizontal size={20} />}
          <span className="text-[10px]">Mais</span>
        </button>
      </nav>

      {/* Menu "Mais" expandido */}
      {moreOpen && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 z-40 shadow-lg">
          <div className="grid grid-cols-3 gap-0">
            {visibleItems.slice(4).map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex flex-col items-center gap-1 py-4 text-xs font-medium border-b border-gray-100 transition-colors",
                  pathname.startsWith(href) ? "text-black bg-gray-50" : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <Icon size={22} />
                <span className="text-[10px] text-center">{label}</span>
              </Link>
            ))}
            <button
              onClick={handleSignOut}
              className="flex flex-col items-center gap-1 py-4 text-xs font-medium text-red-400 border-b border-gray-100"
            >
              <LogOut size={22} />
              <span className="text-[10px]">Sair</span>
            </button>
          </div>
        </div>
      )}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-30" onClick={() => setMoreOpen(false)} />
      )}
    </>
  );
}
