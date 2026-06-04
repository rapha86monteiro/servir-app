import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { AppUser, Role } from "./types";

export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signOut() {
  return firebaseSignOut(auth);
}

export async function createUser(
  email: string,
  password: string,
  name: string,
  role: Role,
  teamIds: string[] = []
) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user: AppUser = {
    uid: credential.user.uid,
    name,
    email,
    role,
    teamIds,
  };
  await setDoc(doc(db, "users", credential.user.uid), user);
  return user;
}

export async function getUserProfile(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  // Sempre garante que uid esteja preenchido (alguns documentos antigos não têm)
  return { ...(snap.data() as AppUser), uid: snap.id };
}
