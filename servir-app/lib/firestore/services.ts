import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Service } from "../types";

const col = () => collection(db, "services");

export async function getServices(): Promise<Service[]> {
  const q = query(col(), orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Service));
}

export async function createService(data: Omit<Service, "id">): Promise<Service> {
  const ref = await addDoc(col(), data);
  return { id: ref.id, ...data };
}

export async function updateService(id: string, data: Partial<Service>) {
  await updateDoc(doc(db, "services", id), data);
}

export async function deleteService(id: string) {
  await deleteDoc(doc(db, "services", id));
}
