"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, UserCheck2, ShieldCheck } from "lucide-react";

const tabs = [
  { href: "/app/teams", label: "Equipes", icon: Users },
  { href: "/app/aprovacoes", label: "Aprovações", icon: UserCheck2 },
  { href: "/app/perfis", label: "Permissões", icon: ShieldCheck },
];

export function ConfigTabs() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 min-w-fit flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              active ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon size={15} /> {label}
          </Link>
        );
      })}
    </div>
  );
}
