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
} from "firebase/firestore";
import { db } from "../firebase";
import type { Member } from "../types";

const col = () => collection(db, "members");

export async function getMembers(): Promise<Member[]> {
  const snap = await getDocs(col());
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Member));
}

export async function getMembersByTeam(teamId: string): Promise<Member[]> {
  const q = query(col(), where("teamId", "==", teamId), where("active", "==", true));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Member));
}

export async function getMember(id: string): Promise<Member | null> {
  const snap = await getDoc(doc(db, "members", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Member) : null;
}

export async function createMember(data: Omit<Member, "id">): Promise<Member> {
  const ref = await addDoc(col(), data);
  return { id: ref.id, ...data };
}

export async function updateMember(id: string, data: Partial<Member>) {
  await updateDoc(doc(db, "members", id), data);
}

export async function deleteMember(id: string) {
  await deleteDoc(doc(db, "members", id));
}
