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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

// minRole: undefined = todos, "leader" = líderes/coordenador, "admin" = só admin/coordenador
const navItems = [
  { href: "/app/dashboard", label: "Início", icon: LayoutDashboard, minRole: undefined },
  { href: "/app/calendario", label: "Calendário", icon: Calendar, minRole: undefined },
  { href: "/app/schedules", label: "Escalas", icon: ClipboardList, minRole: undefined },
  { href: "/app/substituicoes", label: "Substituições", icon: RefreshCw, minRole: undefined },
  { href: "/app/members", label: "Membros", icon: UserCheck, minRole: undefined },
  { href: "/app/relatorio", label: "Relatórios", icon: ClipboardCheck, minRole: "leader" },
  { href: "/app/historico", label: "Histórico", icon: History, minRole: "leader" },
  { href: "/app/forms", label: "Formulários", icon: FileText, minRole: "leader" },
  { href: "/app/aprovacoes", label: "Aprovações", icon: UserCheck2, minRole: "admin" },
  { href: "/app/teams", label: "Equipes", icon: Users, minRole: "admin" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { appUser } = useAuth();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    document.cookie = "firebase-token=; Max-Age=0; path=/";
    router.push("/login");
  };

  const role = appUser?.role ?? "member";
  const funcao = appUser?.funcao;
  const isCoord = role === "admin" || funcao === "Coordenador";
  const isLeader = isCoord || funcao === "Líder" || funcao === "Co-líder";
  const visibleItems = navItems.filter((item) => {
    if (!item.minRole) return true;
    if (item.minRole === "leader") return isLeader;
    if (item.minRole === "admin") return isCoord;
    return true;
  });

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
