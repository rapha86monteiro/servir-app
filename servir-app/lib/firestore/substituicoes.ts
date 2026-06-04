import {
  collection, doc, getDocs, addDoc, updateDoc,
  deleteDoc, query, where, orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Substituicao } from "../types";

const col = () => collection(db, "substituicoes");

export async function getSubstituicoes(): Promise<Substituicao[]> {
  const q = query(col(), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Substituicao));
}

export async function getSubstituicoesAbertas(): Promise<Substituicao[]> {
  const q = query(col(), where("status", "==", "aberta"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Substituicao));
}

export async function getSubstituicoesByTeam(teamId: string): Promise<Substituicao[]> {
  const q = query(col(), where("teamId", "==", teamId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Substituicao));
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
