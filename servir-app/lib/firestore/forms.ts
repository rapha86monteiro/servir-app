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
import type { CustomForm, FormResponse } from "../types";

const formsCol = () => collection(db, "forms");
const responsesCol = () => collection(db, "formResponses");

export async function getForms(): Promise<CustomForm[]> {
  const snap = await getDocs(formsCol());
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CustomForm));
}

export async function getFormsByTeam(teamId: string): Promise<CustomForm[]> {
  const q = query(formsCol(), where("teamId", "==", teamId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CustomForm));
}

export async function getForm(id: string): Promise<CustomForm | null> {
  const snap = await getDoc(doc(db, "forms", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as CustomForm) : null;
}

export async function createForm(data: Omit<CustomForm, "id">): Promise<CustomForm> {
  const ref = await addDoc(formsCol(), data);
  return { id: ref.id, ...data };
}

export async function updateForm(id: string, data: Partial<CustomForm>) {
  await updateDoc(doc(db, "forms", id), data);
}

export async function deleteForm(id: string) {
  await deleteDoc(doc(db, "forms", id));
}

export async function getFormResponses(formId: string): Promise<FormResponse[]> {
  const q = query(responsesCol(), where("formId", "==", formId), orderBy("submittedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FormResponse));
}

export async function submitFormResponse(data: Omit<FormResponse, "id">): Promise<FormResponse> {
  const ref = await addDoc(responsesCol(), data);
  return { id: ref.id, ...data };
}
