import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export interface Aviso {
  id: string;
  titulo: string;
  mensagem: string;
  autor: string;
  fixado: boolean;
  createdAt: string;
}

const col = () => collection(db, "avisos");

export async function getAvisos(): Promise<Aviso[]> {
  const snap = await getDocs(col());
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Aviso));
  // Fixados primeiro, depois por data desc
  return items.sort((a, b) => {
    if (a.fixado !== b.fixado) return a.fixado ? -1 : 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export async function createAviso(data: Omit<Aviso, "id">): Promise<Aviso> {
  const ref = await addDoc(col(), data);
  return { id: ref.id, ...data };
}

export async function toggleFixarAviso(id: string, fixado: boolean) {
  await updateDoc(doc(db, "avisos", id), { fixado });
}

export async function deleteAviso(id: string) {
  await deleteDoc(doc(db, "avisos", id));
}
