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
import type { Team } from "../types";

const col = () => collection(db, "teams");

export async function getTeams(): Promise<Team[]> {
  const snap = await getDocs(col());
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Team));
}

export async function getTeam(id: string): Promise<Team | null> {
  const snap = await getDoc(doc(db, "teams", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Team) : null;
}

export async function getTeamsByLeader(leaderId: string): Promise<Team[]> {
  const q = query(col(), where("leaderIds", "array-contains", leaderId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Team));
}

export async function createTeam(data: Omit<Team, "id">): Promise<Team> {
  const ref = await addDoc(col(), data);
  return { id: ref.id, ...data };
}

export async function updateTeam(id: string, data: Partial<Team>) {
  await updateDoc(doc(db, "teams", id), data);
}

export async function deleteTeam(id: string) {
  await deleteDoc(doc(db, "teams", id));
}
