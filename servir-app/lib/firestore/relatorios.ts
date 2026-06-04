import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Relatorio } from "../types";

const col = () => collection(db, "relatorios");

export async function getRelatorios(): Promise<Relatorio[]> {
  const q = query(col(), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Relatorio));
}

export async function getRelatoriosByTeam(teamId: string): Promise<Relatorio[]> {
  const q = query(col(), where("teamId", "==", teamId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Relatorio));
}

export async function getRelatorio(id: string): Promise<Relatorio | null> {
  const snap = await getDoc(doc(db, "relatorios", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Relatorio) : null;
}

export async function createRelatorio(data: Omit<Relatorio, "id">): Promise<Relatorio> {
  const ref = await addDoc(col(), data);
  return { id: ref.id, ...data };
}

export async function updateRelatorio(id: string, data: Partial<Relatorio>) {
  await updateDoc(doc(db, "relatorios", id), data);
}

export async function deleteRelatorio(id: string) {
  await deleteDoc(doc(db, "relatorios", id));
}
