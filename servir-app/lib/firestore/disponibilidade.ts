import {
  collection, doc, getDocs, addDoc, deleteDoc, query, where,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Indisponibilidade } from "../types";

const col = () => collection(db, "indisponibilidades");

export async function getIndisponibilidades(): Promise<Indisponibilidade[]> {
  const snap = await getDocs(col());
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Indisponibilidade));
}

export async function getMinhasIndisponibilidades(uid: string): Promise<Indisponibilidade[]> {
  const q = query(col(), where("uid", "==", uid));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Indisponibilidade));
  return items.sort((a, b) => a.date.localeCompare(b.date));
}

export async function addIndisponibilidade(data: Omit<Indisponibilidade, "id">): Promise<Indisponibilidade> {
  const ref = await addDoc(col(), data);
  return { id: ref.id, ...data };
}

export async function removeIndisponibilidade(id: string) {
  await deleteDoc(doc(db, "indisponibilidades", id));
}
