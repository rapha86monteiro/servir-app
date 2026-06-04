"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronRight, ChevronLeft, X, CheckCircle2, CalendarX, Award, Bell, ClipboardList } from "lucide-react";

const STORAGE_KEY = "belem-welcome-v1";

const SLIDES = [
  {
    icon: null,
    title: "Bem-vindo ao Belém Servir! 🙌",
    text: "O app do Departamento Servir da Belém Church. Aqui você acompanha suas escalas, confirma presença e muito mais.",
  },
  {
    icon: ClipboardList,
    title: "Suas Escalas",
    text: "Veja em quais cultos você foi escalado e em qual posição vai servir. Tudo organizado por data e turno.",
  },
  {
    icon: CheckCircle2,
    title: "Confirme sua presença",
    text: "Quando o líder te escalar, você recebe um link para confirmar se vai poder servir. Se não puder, pode pedir um substituto.",
  },
  {
    icon: CalendarX,
    title: "Marque sua disponibilidade",
    text: "Em 'Minha Área', marque antecipadamente os dias que você NÃO pode servir. Seu líder verá e evitará te escalar.",
  },
  {
    icon: Award,
    title: "Acompanhe sua jornada",
    text: "Veja quantas vezes você já serviu, suas posições favoritas e seu histórico completo de participação.",
  },
  {
    icon: Bell,
    title: "Ative as notificações",
    text: "Em 'Minha Área → Notificações', ative os alertas para não perder nenhuma escala, aviso ou aniversário. 🎉",
  },
];

export function WelcomeTutorial() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) setOpen(true);
    // Permite reabrir via evento global
    const handler = () => { setStep(0); setOpen(true); };
    window.addEventListener("open-tutorial", handler);
    return () => window.removeEventListener("open-tutorial", handler);
  }, []);

  function close() {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  }

  if (!open) return null;

  const slide = SLIDES[step];
  const Icon = slide.icon;
  const isLast = step === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
        {/* Topo */}
        <div className="bg-[#0a0a0a] p-6 text-center relative">
          <button onClick={close} className="absolute top-3 right-3 text-white/50 hover:text-white">
            <X size={20} />
          </button>
          {step === 0 ? (
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto overflow-hidden">
              <Image src="/logo.png" alt="Belém" width={64} height={64} className="object-contain" />
            </div>
          ) : Icon ? (
            <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto">
              <Icon size={36} className="text-white" />
            </div>
          ) : null}
        </div>

        {/* Conteúdo */}
        <div className="p-6 text-center">
          <h2 className="text-lg font-bold text-gray-900 mb-2">{slide.title}</h2>
          <p className="text-sm text-gray-500 leading-relaxed min-h-16">{slide.text}</p>

          {/* Indicadores */}
          <div className="flex justify-center gap-1.5 my-5">
            {SLIDES.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-black" : "w-1.5 bg-gray-200"}`} />
            ))}
          </div>

          {/* Botões */}
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                <ChevronLeft size={16} />
              </button>
            )}
            {isLast ? (
              <button onClick={close} className="flex-1 bg-[#0a0a0a] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1a1a1a]">
                Começar a usar 🚀
              </button>
            ) : (
              <button onClick={() => setStep(step + 1)} className="flex-1 bg-[#0a0a0a] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1a1a1a] flex items-center justify-center gap-1">
                Próximo <ChevronRight size={16} />
              </button>
            )}
          </div>
          {!isLast && (
            <button onClick={close} className="text-xs text-gray-400 mt-3 hover:text-gray-600">Pular tutorial</button>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper para reabrir o tutorial de qualquer lugar
export function abrirTutorial() {
  window.dispatchEvent(new Event("open-tutorial"));
}
