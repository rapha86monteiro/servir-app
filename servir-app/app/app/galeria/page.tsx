"use client";

import { useEffect, useState } from "react";
import { getRelatorios } from "@/lib/firestore/relatorios";
import { formatDate } from "@/lib/utils";
import { ImageIcon, X } from "lucide-react";

interface Foto {
  src: string;
  serviceTitle: string;
  serviceDate: string;
  teamName: string;
}

export default function GaleriaPage() {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<Foto | null>(null);

  useEffect(() => {
    async function load() {
      const rels = await getRelatorios().catch(() => []);
      const all: Foto[] = [];
      rels.forEach((r) => {
        (r.fotos ?? []).forEach((src) => {
          all.push({ src, serviceTitle: r.serviceTitle, serviceDate: r.serviceDate, teamName: r.teamName });
        });
      });
      setFotos(all);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Galeria</h1>
        <p className="text-gray-500 text-sm">{fotos.length} foto{fotos.length !== 1 ? "s" : ""} dos cultos</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-black" />
        </div>
      ) : fotos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <ImageIcon size={32} className="text-gray-200 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">Nenhuma foto ainda. As fotos dos relatórios aparecem aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {fotos.map((foto, idx) => (
            <button
              key={idx}
              onClick={() => setLightbox(foto)}
              className="aspect-square rounded-xl overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity"
            >
              <img src={foto.src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white p-2" onClick={() => setLightbox(null)}>
            <X size={24} />
          </button>
          <div className="max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.src} alt="" className="w-full rounded-xl" />
            <div className="text-center mt-3 text-white">
              <p className="font-semibold">{lightbox.serviceTitle}</p>
              <p className="text-white/60 text-sm">{lightbox.teamName} · {formatDate(lightbox.serviceDate)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
