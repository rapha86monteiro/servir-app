"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, History, BarChart3, Image as ImageIcon } from "lucide-react";

const tabs = [
  { href: "/app/relatorio", label: "Enviar", icon: FileText },
  { href: "/app/historico", label: "Histórico", icon: History },
  { href: "/app/relatorio-mensal", label: "Mensal", icon: BarChart3 },
  { href: "/app/galeria", label: "Fotos", icon: ImageIcon },
];

export function ReportTabs() {
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
