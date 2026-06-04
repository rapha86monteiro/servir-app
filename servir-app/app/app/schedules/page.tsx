"use client";

import { useEffect, useState } from "react";
import {
  getSchedules, getSchedulesByTeam, createSchedule,
  deleteSchedule, updateSchedulePositions
} from "@/lib/firestore/schedules";
import { getTeams, getTeamsByLeader } from "@/lib/firestore/teams";
import { getServices } from "@/lib/firestore/services";
import { getMembers } from "@/lib/firestore/members";
import { getIndisponibilidades } from "@/lib/firestore/disponibilidade";
import type { Indisponibilidade } from "@/lib/types";
import type { Schedule, Team, Service, Member, PositionSlots, ScheduleSlot } from "@/lib/types";
import { POSITIONS } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Input";
import { Plus, Trash2, Share2, Copy, X, Search, ChevronDown, CopyPlus, ArrowLeftRight, UserCheck, Check } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";

const TURNO_COLORS: Record<string, string> = {
  "Manhã": "bg-yellow-100 text-yellow-700",
  "Tarde": "bg-orange-100 text-orange-700",
  "Noite": "bg-blue-100 text-blue-700",
  "Especial": "bg-purple-100 text-purple-700",
};

const POSITION_ICONS: Record<string, string> = {
  "Estacionamento": "🚗",
  "Portão": "🚪",
  "Hall de Entrada": "🏛️",
  "Recepção": "💛",
  "Templo": "⛪",
  "Frente": "🔑",
  "Diretor de Culto": "🎯",
  "Banheiro": "🚻",
  "Mezanino": "📐",
  "Oferta": "💰",
  "Apoio e Limpeza": "🧹",
  "Gabinete": "🗂️",
};

export default function SchedulesPage() {
  const { appUser } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Schedule | null>(null);
  const [showCultoList, setShowCultoList] = useState(false);
  const [newModal, setNewModal] = useState(false);
  const [memberModal, setMemberModal] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberTeamFilter, setMemberTeamFilter] = useState("");
  // Equipes para o filtro: admin vê todas, líder também (para escalar de outras equipes)
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  // Copiar escala
  const [copyModal, setCopyModal] = useState(false);
  const [copyServiceId, setCopyServiceId] = useState("");
  // Trocar voluntários
  const [swapModal, setSwapModal] = useState(false);
  const [swapA, setSwapA] = useState<{ position: string; memberId: string } | null>(null);
  // Check-in
  const [checkinMode, setCheckinMode] = useState(false);
  // Indisponibilidades
  const [indisponibilidades, setIndisponibilidades] = useState<Indisponibilidade[]>([]);
  const [newServiceId, setNewServiceId] = useState("");
  const [newTeamId, setNewTeamId] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => { load(); }, [appUser]);

  async function load() {
    if (!appUser) return;
    setLoading(true);
    const [t, s, m, todasEquipes, indisp] = await Promise.all([
      appUser.role === "admin" ? getTeams() : getTeamsByLeader(appUser.uid),
      getServices(),
      getMembers(),
      getTeams(),
      getIndisponibilidades().catch(() => []),
    ]);
    setTeams(t);
    setServices(s);
    setMembers(m);
    todasEquipes.sort((a, b) => a.name.localeCompare(b.name));
    setAllTeams(todasEquipes);
    setIndisponibilidades(indisp);

    let scheds: Schedule[];
    if (appUser.role === "admin") {
      scheds = await getSchedules();
    } else {
      const all = await Promise.all(t.map((team) => getSchedulesByTeam(team.id)));
      scheds = all.flat();
    }
    scheds.sort((a, b) => b.serviceDate.localeCompare(a.serviceDate));
    setSchedules(scheds);
    if (scheds.length > 0) setSelected(scheds[0]);
    setLoading(false);
  }

  async function handleCreate() {
    if (!newServiceId || !newTeamId) return;
    const service = services.find((s) => s.id === newServiceId)!;
    const team = teams.find((t) => t.id === newTeamId)!;
    const emptyPositions: PositionSlots = {};
    POSITIONS.forEach((p) => { emptyPositions[p] = []; });
    const sched = await createSchedule({
      serviceId: newServiceId,
      serviceTitle: service.title,
      serviceDate: service.date,
      serviceTurno: service.turno,
      teamId: newTeamId,
      teamName: team.name,
      leaderId: appUser?.uid ?? "admin",
      positions: emptyPositions,
      publicToken: uuidv4(),
      createdAt: new Date().toISOString(),
    });
    setNewModal(false);
    setNewServiceId(""); setNewTeamId("");
    await load();
    setSelected(sched);
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta escala?")) return;
    await deleteSchedule(id);
    setSelected(null);
    load();
  }

  // Copia a escala atual para outro culto (zera confirmações)
  async function handleCopy() {
    if (!selected || !copyServiceId) return;
    const service = services.find((s) => s.id === copyServiceId)!;

    // Duplica posições resetando confirmação
    const novasPositions: PositionSlots = {};
    POSITIONS.forEach((p) => {
      const slots = selected.positions?.[p] ?? [];
      novasPositions[p] = slots.map((s) => ({
        memberId: s.memberId,
        memberName: s.memberName,
        teamName: s.teamName,
        confirmed: null,
        justification: "",
        needsSubstitute: false,
      }));
    });

    const sched = await createSchedule({
      serviceId: copyServiceId,
      serviceTitle: service.title,
      serviceDate: service.date,
      serviceTurno: service.turno,
      teamId: selected.teamId,
      teamName: selected.teamName,
      leaderId: appUser?.uid ?? "admin",
      positions: novasPositions,
      publicToken: uuidv4(),
      createdAt: new Date().toISOString(),
    });
    setCopyModal(false);
    setCopyServiceId("");
    await load();
    setSelected(sched);
    alert("Escala copiada! As confirmações foram zeradas para o novo culto.");
  }

  // Troca duas pessoas de posição
  async function doSwap(b: { position: string; memberId: string }) {
    if (!selected || !swapA) return;
    const positions: PositionSlots = JSON.parse(JSON.stringify(selected.positions));
    const slotA = positions[swapA.position]?.find((s) => s.memberId === swapA.memberId);
    const slotB = positions[b.position]?.find((s) => s.memberId === b.memberId);
    if (!slotA || !slotB) { setSwapA(null); return; }

    // Remove ambos das posições atuais
    positions[swapA.position] = positions[swapA.position].filter((s) => s.memberId !== swapA.memberId);
    positions[b.position] = positions[b.position].filter((s) => s.memberId !== b.memberId);

    // Adiciona trocado
    positions[b.position].push(slotA);
    positions[swapA.position].push(slotB);

    await updateSchedulePositions(selected.id, positions);
    const updated = { ...selected, positions };
    setSelected(updated);
    setSchedules((prev) => prev.map((s) => s.id === selected.id ? updated : s));
    setSwapA(null);
    setSwapModal(false);
  }

  async function addMemberToPosition(position: string, member: Member) {
    if (!selected) return;
    const already = selected.positions[position]?.some((s) => s.memberId === member.id);
    if (already) return;
    const slot: ScheduleSlot = {
      memberId: member.id,
      memberName: member.name,
      teamName: teams.find((t) => t.id === member.teamId)?.name ?? "",
      confirmed: null,
      justification: "",
    };
    const updated: PositionSlots = {
      ...selected.positions,
      [position]: [...(selected.positions[position] ?? []), slot],
    };
    await updateSchedulePositions(selected.id, updated);
    const updatedSched = { ...selected, positions: updated };
    setSelected(updatedSched);
    setSchedules((prev) => prev.map((s) => s.id === selected.id ? updatedSched : s));
    setMemberModal(null);
  }

  // Marca presença real (check-in)
  async function setCheckIn(position: string, memberId: string, value: boolean) {
    if (!selected) return;
    const positions: PositionSlots = { ...selected.positions };
    positions[position] = (positions[position] ?? []).map((s) =>
      s.memberId === memberId ? { ...s, checkedIn: value } : s
    );
    await updateSchedulePositions(selected.id, positions);
    const updated = { ...selected, positions };
    setSelected(updated);
    setSchedules((prev) => prev.map((s) => s.id === selected.id ? updated : s));
  }

  // Verifica se um membro está indisponível na data da escala selecionada
  function isIndisponivel(memberId: string): string | null {
    if (!selected) return null;
    const ind = indisponibilidades.find(
      (i) => i.memberId === memberId && i.date === selected.serviceDate
    );
    return ind ? (ind.motivo || "Indisponível") : null;
  }

  async function removeMember(position: string, memberId: string) {
    if (!selected) return;
    const updated: PositionSlots = {
      ...selected.positions,
      [position]: (selected.positions[position] ?? []).filter((s) => s.memberId !== memberId),
    };
    await updateSchedulePositions(selected.id, updated);
    const updatedSched = { ...selected, positions: updated };
    setSelected(updatedSched);
    setSchedules((prev) => prev.map((s) => s.id === selected.id ? updatedSched : s));
  }

  function getPublicUrl() {
    return `${typeof window !== "undefined" ? window.location.origin : ""}/confirmar/${selected?.publicToken}`;
  }

  function shareWhatsApp() {
    if (!selected) return;
    const total = selected.positions ? Object.values(selected.positions).reduce((acc, s) => acc + (s?.length ?? 0), 0) : 0;
    const url = getPublicUrl();
    const text = `📋 *Escala ${selected.teamName}*\n🗓️ ${selected.serviceTitle} — ${formatDate(selected.serviceDate)} (${selected.serviceTurno})\n👥 ${total} escalados\n\nConfirme sua presença: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  async function copyLink() {
    await navigator.clipboard.writeText(getPublicUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const totalEscalados = selected?.positions
    ? Object.values(selected.positions).reduce((acc, s) => acc + (s?.length ?? 0), 0)
    : 0;

  const allSelectedSlots = selected?.positions
    ? Object.values(selected.positions).flat()
    : [];
  const confirmadosCount = allSelectedSlots.filter((s) => s.confirmed === true).length;
  const recusadosCount = allSelectedSlots.filter((s) => s.confirmed === false).length;
  const pendentesCount = allSelectedSlots.filter((s) => s.confirmed === null).length;
  const percentConfirmado = totalEscalados > 0 ? Math.round((confirmadosCount / totalEscalados) * 100) : 0;

  const filteredMembers = members.filter(
    (m) =>
      m.active &&
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) &&
      (!memberTeamFilter || m.teamId === memberTeamFilter)
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Escalas</h1>
          <p className="text-gray-500 text-sm">{schedules.length} escalas criadas</p>
        </div>
        <Button onClick={() => setNewModal(true)} size="sm">
          <Plus size={15} /> Nova Escala
        </Button>
      </div>

      {schedules.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <p className="text-gray-400 text-sm">Nenhuma escala criada ainda.</p>
        </div>
      ) : (
        <>
          {/* Seletor de culto — mobile friendly */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowCultoList(!showCultoList)}
              className="w-full p-4 flex items-center justify-between"
            >
              <div className="text-left">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Culto selecionado</p>
                {selected ? (
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <p className="font-bold text-gray-900">{selected.serviceTitle}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TURNO_COLORS[selected.serviceTurno] ?? "bg-gray-100 text-gray-600"}`}>
                      {selected.serviceTurno}
                    </span>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Selecione um culto</p>
                )}
                {selected && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(selected.serviceDate)} · {selected.teamName} · {totalEscalados} escalados
                  </p>
                )}
              </div>
              <ChevronDown size={18} className={`text-gray-400 transition-transform ${showCultoList ? "rotate-180" : ""}`} />
            </button>

            {showCultoList && (
              <div className="border-t border-gray-100 max-h-64 overflow-y-auto">
                {schedules.map((s) => {
                  const total = s.positions ? Object.values(s.positions).reduce((acc, slots) => acc + (slots?.length ?? 0), 0) : 0;
                  const isSelected = selected?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => { setSelected(s); setShowCultoList(false); }}
                      className={`w-full text-left px-4 py-3 border-b border-gray-50 flex items-center justify-between transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-semibold ${isSelected ? "text-blue-600" : "text-gray-900"}`}>
                            {s.serviceTitle}
                          </p>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${TURNO_COLORS[s.serviceTurno] ?? "bg-gray-100 text-gray-600"}`}>
                            {s.serviceTurno}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{formatDate(s.serviceDate)} · {s.teamName} · {total} escalados</p>
                      </div>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Botões de ação */}
          {selected && (
            <div className="flex gap-2">
              <button
                onClick={shareWhatsApp}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-xl font-medium text-sm hover:bg-green-600 transition-colors"
              >
                <Share2 size={16} /> WhatsApp
              </button>
              <button
                onClick={copyLink}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Copy size={15} /> {copied ? "Copiado!" : "Link"}
              </button>
              <button
                onClick={() => handleDelete(selected.id)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-500 rounded-xl text-sm hover:bg-red-50 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          )}

          {/* Ações extras: copiar e trocar */}
          {selected && (
            <div className="flex gap-2">
              <button
                onClick={() => { setCopyServiceId(""); setCopyModal(true); }}
                className="flex-1 flex items-center justify-center gap-2 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <CopyPlus size={15} /> Copiar escala
              </button>
              {totalEscalados >= 2 && (
                <button
                  onClick={() => { setSwapA(null); setSwapModal(true); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeftRight size={15} /> Trocar pessoas
                </button>
              )}
            </div>
          )}

          {/* Botão modo check-in */}
          {selected && totalEscalados > 0 && (
            <button
              onClick={() => setCheckinMode(!checkinMode)}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                checkinMode ? "bg-[#0a0a0a] text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <UserCheck size={16} /> {checkinMode ? "Sair do modo check-in" : "Fazer check-in (presença no dia)"}
            </button>
          )}

          {/* Termômetro da escala */}
          {selected && totalEscalados > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-900">Termômetro da Escala</p>
                <span className={`text-sm font-bold ${percentConfirmado >= 80 ? "text-green-600" : percentConfirmado >= 50 ? "text-amber-600" : "text-red-500"}`}>
                  {percentConfirmado}% confirmado
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${totalEscalados > 0 ? (confirmadosCount / totalEscalados) * 100 : 0}%` }}
                />
                <div
                  className="h-full bg-red-400 transition-all"
                  style={{ width: `${totalEscalados > 0 ? (recusadosCount / totalEscalados) * 100 : 0}%` }}
                />
              </div>
              <div className="flex gap-4 mt-2 text-xs">
                <span className="flex items-center gap-1 text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-500" /> {confirmadosCount} confirmados
                </span>
                <span className="flex items-center gap-1 text-red-500">
                  <span className="w-2 h-2 rounded-full bg-red-400" /> {recusadosCount} recusados
                </span>
                <span className="flex items-center gap-1 text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-gray-300" /> {pendentesCount} pendentes
                </span>
              </div>
            </div>
          )}

          {/* Cards de posições */}
          {selected && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {POSITIONS.map((position) => {
                const slots = (selected.positions ?? {})[position] ?? [];
                return (
                  <div key={position} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{POSITION_ICONS[position]}</span>
                        <p className="font-semibold text-gray-900 text-sm">{position}</p>
                      </div>
                      <span className="text-xs bg-gray-100 text-gray-600 rounded-full w-6 h-6 flex items-center justify-center font-bold">
                        {slots.length}
                      </span>
                    </div>

                    {slots.length === 0 ? (
                      <p className="text-xs text-gray-300 italic mb-3">Ninguém escalado</p>
                    ) : (
                      <ul className="space-y-2 mb-3">
                        {slots.map((slot) => (
                          <li key={slot.memberId} className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${slot.confirmed === true ? "bg-green-400" : slot.confirmed === false ? "bg-red-400" : "bg-gray-300"}`} />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800 leading-none truncate">{slot.memberName}</p>
                                <p className="text-xs text-gray-400">{slot.teamName}</p>
                              </div>
                            </div>
                            {checkinMode ? (
                              <div className="flex gap-1 flex-shrink-0">
                                <button
                                  onClick={() => setCheckIn(position, slot.memberId, true)}
                                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${slot.checkedIn === true ? "bg-green-500 text-white" : "border border-gray-200 text-gray-300 hover:border-green-400 hover:text-green-500"}`}
                                  title="Presente"
                                >
                                  <Check size={13} />
                                </button>
                                <button
                                  onClick={() => setCheckIn(position, slot.memberId, false)}
                                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${slot.checkedIn === false ? "bg-red-500 text-white" : "border border-gray-200 text-gray-300 hover:border-red-400 hover:text-red-500"}`}
                                  title="Faltou"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => removeMember(position, slot.memberId)}
                                className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors flex-shrink-0"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    {!checkinMode && (
                      <button
                        onClick={() => { setMemberModal(position); setMemberSearch(""); }}
                        className="w-full py-2 border border-dashed border-gray-200 rounded-lg text-xs text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors active:bg-blue-50"
                      >
                        + Escalar pessoa
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal copiar escala */}
      <Modal open={copyModal} onClose={() => setCopyModal(false)} title="Copiar Escala" size="sm">
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
            Copia todas as pessoas desta escala (<strong>{selected?.teamName}</strong>) para outro culto. As confirmações serão zeradas.
          </div>
          <Select label="Culto de destino" value={copyServiceId} onChange={(e) => setCopyServiceId(e.target.value)}>
            <option value="">Selecione o culto</option>
            {services
              .filter((s) => s.id !== selected?.serviceId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} — {formatDate(s.date)} ({s.turno})
                </option>
              ))}
          </Select>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setCopyModal(false)}>Cancelar</Button>
            <Button onClick={handleCopy} disabled={!copyServiceId}>Copiar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal trocar pessoas */}
      <Modal open={swapModal} onClose={() => { setSwapModal(false); setSwapA(null); }} title="Trocar Pessoas de Posição" size="sm">
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            {!swapA ? "1️⃣ Toque na primeira pessoa" : "2️⃣ Agora toque na pessoa para trocar de lugar"}
          </p>
          {swapA && (
            <div className="bg-blue-50 rounded-lg p-2 text-sm text-blue-700 flex items-center justify-between">
              <span>Selecionado: <strong>{selected?.positions[swapA.position]?.find((s) => s.memberId === swapA.memberId)?.memberName}</strong> ({swapA.position})</span>
              <button onClick={() => setSwapA(null)} className="text-xs underline">trocar</button>
            </div>
          )}
          <div className="max-h-80 overflow-y-auto space-y-1">
            {selected && POSITIONS.map((position) => {
              const slots = selected.positions?.[position] ?? [];
              if (slots.length === 0) return null;
              return (
                <div key={position}>
                  <p className="text-xs font-semibold text-gray-400 px-1 py-1">{position}</p>
                  {slots.map((slot) => {
                    const isSelectedA = swapA?.position === position && swapA?.memberId === slot.memberId;
                    return (
                      <button
                        key={slot.memberId}
                        onClick={() => {
                          if (!swapA) setSwapA({ position, memberId: slot.memberId });
                          else if (isSelectedA) setSwapA(null);
                          else doSwap({ position, memberId: slot.memberId });
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${isSelectedA ? "bg-blue-100 ring-1 ring-blue-400" : "hover:bg-gray-50"}`}
                      >
                        <span className="font-medium text-gray-800">{slot.memberName}</span>
                        <span className="text-xs text-gray-400 ml-2">{slot.teamName}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* Modal nova escala */}
      <Modal open={newModal} onClose={() => setNewModal(false)} title="Nova Escala" size="sm">
        <div className="space-y-4">
          <Select label="Culto" value={newServiceId} onChange={(e) => setNewServiceId(e.target.value)}>
            <option value="">Selecione o culto</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} — {formatDate(s.date)} ({s.turno})
              </option>
            ))}
          </Select>
          <Select label="Equipe responsável" value={newTeamId} onChange={(e) => setNewTeamId(e.target.value)}>
            <option value="">Selecione a equipe</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setNewModal(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newServiceId || !newTeamId}>Criar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal escalar membro */}
      <Modal open={!!memberModal} onClose={() => { setMemberModal(null); setMemberTeamFilter(""); }} title={`Escalar em ${memberModal}`} size="sm">
        <div className="space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Buscar membro..."
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>
          {/* Filtro por equipe — permite escalar de qualquer equipe */}
          <select
            value={memberTeamFilter}
            onChange={(e) => setMemberTeamFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todas as equipes</option>
            {allTeams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <div className="max-h-72 overflow-y-auto space-y-1">
            {filteredMembers.map((m) => {
              const team = teams.find((t) => t.id === m.teamId);
              const alreadyIn = memberModal && selected?.positions[memberModal]?.some((s) => s.memberId === m.id);
              const indispMotivo = isIndisponivel(m.id);
              return (
                <button
                  key={m.id}
                  disabled={!!alreadyIn}
                  onClick={() => {
                    if (indispMotivo && !confirm(`⚠️ ${m.name} marcou que NÃO pode servir neste dia (${indispMotivo}).\n\nEscalar mesmo assim?`)) return;
                    memberModal && addMemberToPosition(memberModal, m);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors ${alreadyIn ? "opacity-40 cursor-not-allowed bg-gray-50" : indispMotivo ? "bg-red-50 hover:bg-red-100" : "hover:bg-blue-50 active:bg-blue-100"}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                      {m.name}
                      {indispMotivo && <span className="text-xs text-red-500">🚫</span>}
                    </p>
                    <p className="text-xs text-gray-400">
                      {team?.name}
                      {indispMotivo && <span className="text-red-500 ml-1">· Indisponível</span>}
                    </p>
                  </div>
                  {alreadyIn && <span className="text-xs text-green-500 font-medium">✓ Escalado</span>}
                </button>
              );
            })}
            {filteredMembers.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-6">Nenhum membro encontrado</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
