import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc,
  deleteDoc, query, where, orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Substituicao, Schedule, PositionSlots, ScheduleSlot } from "../types";

const col = () => collection(db, "substituicoes");

export async function getSubstituicoes(): Promise<Substituicao[]> {
  const snap = await getDocs(col());
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Substituicao));
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSubstituicoesAbertas(): Promise<Substituicao[]> {
  const q = query(col(), where("status", "==", "aberta"));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Substituicao));
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSubstituicoesByTeam(teamId: string): Promise<Substituicao[]> {
  const q = query(col(), where("teamId", "==", teamId));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Substituicao));
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createSubstituicao(data: Omit<Substituicao, "id">): Promise<Substituicao> {
  const ref = await addDoc(col(), data);
  return { id: ref.id, ...data };
}

export async function aceitarSubstituicao(id: string, substitutoId: string, substitutoName: string) {
  await updateDoc(doc(db, "substituicoes", id), {
    status: "aceita",
    substitutoId,
    substitutoName,
  });
}

// Aceita a substituição E troca a pessoa na escala
export async function aceitarSubstituicaoCompleta(
  sub: Substituicao,
  substituto: { memberId: string; name: string; teamName: string }
) {
  // 1. Marca o pedido como aceito
  await updateDoc(doc(db, "substituicoes", sub.id), {
    status: "aceita",
    substitutoId: substituto.memberId,
    substitutoName: substituto.name,
  });

  // 2. Atualiza a escala — substitui a pessoa na posição
  const schedSnap = await getDoc(doc(db, "schedules", sub.scheduleId));
  if (!schedSnap.exists()) return;
  const schedule = { id: schedSnap.id, ...schedSnap.data() } as Schedule;

  const positions: PositionSlots = { ...schedule.positions };
  const slots = positions[sub.position] ?? [];

  const novoSlot: ScheduleSlot = {
    memberId: substituto.memberId,
    memberName: substituto.name,
    teamName: substituto.teamName,
    confirmed: true,
    justification: `Substituindo ${sub.membroName}`,
    needsSubstitute: false,
  };

  // Substitui o slot da pessoa original pelo substituto
  const idx = slots.findIndex((s) => s.memberId === sub.membroId);
  if (idx >= 0) {
    slots[idx] = novoSlot;
  } else {
    slots.push(novoSlot);
  }
  positions[sub.position] = slots;

  await updateDoc(doc(db, "schedules", sub.scheduleId), { positions });
}

export async function cancelarSubstituicao(id: string) {
  await updateDoc(doc(db, "substituicoes", id), { status: "cancelada" });
}
