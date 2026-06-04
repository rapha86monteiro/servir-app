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
  ChurchIcon,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/auth";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { href: "/app/teams", label: "Equipes", icon: Users, adminOnly: true },
  { href: "/app/members", label: "Membros", icon: UserCheck, adminOnly: false },
  { href: "/app/services", label: "Cultos", icon: CalendarDays, adminOnly: true },
  { href: "/app/schedules", label: "Escalas", icon: ClipboardList, adminOnly: false },
  { href: "/app/relatorio", label: "Relatórios", icon: ClipboardCheck, adminOnly: false },
  { href: "/app/forms", label: "Formulários", icon: FileText, adminOnly: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const { appUser } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    document.cookie = "firebase-token=; Max-Age=0; path=/";
    router.push("/login");
  };

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || appUser?.role === "admin"
  );

  return (
    <>
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-white flex-col h-screen sticky top-0">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <ChurchIcon size={18} />
          </div>
          <div>
            <p className="font-bold text-sm">Departamento</p>
            <p className="text-blue-400 text-xs font-semibold">SERVIR</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                pathname.startsWith(href)
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-slate-700">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs text-slate-400">Logado como</p>
            <p className="text-sm font-medium text-white truncate">{appUser?.name}</p>
            <span className="text-xs text-blue-400">{appUser?.role === "admin" ? "Administrador" : "Líder"}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex">
        {visibleItems.slice(0, 5).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors",
              pathname.startsWith(href)
                ? "text-blue-600"
                : "text-gray-400"
            )}
          >
            <Icon size={20} />
            <span className="text-[10px]">{label}</span>
          </Link>
        ))}
        <button
          onClick={handleSignOut}
          className="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium text-gray-400"
        >
          <LogOut size={20} />
          <span className="text-[10px]">Sair</span>
        </button>
      </nav>
    </>
  );
}
