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
import type { Schedule, ScheduleSlot } from "../types";

const col = () => collection(db, "schedules");

export async function getSchedules(): Promise<Schedule[]> {
  const snap = await getDocs(col());
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Schedule));
}

export async function getSchedulesByTeam(teamId: string): Promise<Schedule[]> {
  const q = query(col(), where("teamId", "==", teamId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Schedule));
}

export async function getScheduleByToken(token: string): Promise<Schedule | null> {
  const q = query(col(), where("publicToken", "==", token));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Schedule;
}

export async function getSchedule(id: string): Promise<Schedule | null> {
  const snap = await getDoc(doc(db, "schedules", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Schedule) : null;
}

export async function createSchedule(data: Omit<Schedule, "id">): Promise<Schedule> {
  const ref = await addDoc(col(), data);
  return { id: ref.id, ...data };
}

export async function updateSchedule(id: string, data: Partial<Schedule>) {
  await updateDoc(doc(db, "schedules", id), data);
}

export async function confirmSlot(
  scheduleId: string,
  slots: ScheduleSlot[]
) {
  await updateDoc(doc(db, "schedules", scheduleId), { slots });
}

export async function deleteSchedule(id: string) {
  await deleteDoc(doc(db, "schedules", id));
}
