import {
  collection, doc, getDocs, addDoc, updateDoc,
  deleteDoc, query, where, orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Substituicao } from "../types";

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

export async function cancelarSubstituicao(id: string) {
  await updateDoc(doc(db, "substituicoes", id), { status: "cancelada" });
}
