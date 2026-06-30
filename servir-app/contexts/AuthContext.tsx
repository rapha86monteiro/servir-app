"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onIdTokenChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserProfile } from "@/lib/auth";
import type { AppUser } from "@/lib/types";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

interface AuthContextValue {
  firebaseUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  appUser: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onIdTokenChanged dispara no login, no logout e SEMPRE que o token é renovado
    // (o Firebase renova a cada ~1h). A cada disparo, atualizamos o cookie que o
    // middleware usa — assim a sessão não "cai" sozinha depois de 1 hora.
    const unsub = onIdTokenChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const token = await user.getIdToken();
          document.cookie = `firebase-token=${token}; path=/; max-age=${COOKIE_MAX_AGE}`;
        } catch {}
        const profile = await getUserProfile(user.uid);
        setAppUser(profile);
      } else {
        document.cookie = "firebase-token=; path=/; max-age=0";
        setAppUser(null);
      }
      setLoading(false);
    });

    // Segurança extra: renova o token (e o cookie) a cada 50 min enquanto o app estiver aberto
    const interval = setInterval(async () => {
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken(true);
          document.cookie = `firebase-token=${token}; path=/; max-age=${COOKIE_MAX_AGE}`;
        } catch {}
      }
    }, 50 * 60 * 1000);

    return () => { unsub(); clearInterval(interval); };
  }, []);

  return (
    <AuthContext.Provider value={{ firebaseUser, appUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
