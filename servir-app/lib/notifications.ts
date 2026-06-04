import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import app, { db } from "./firebase";

export async function requestNotificationPermission(uid: string): Promise<{ ok: boolean; message: string }> {
  if (typeof window === "undefined") return { ok: false, message: "Sem suporte" };

  const supported = await isSupported().catch(() => false);
  if (!supported) {
    return { ok: false, message: "Seu navegador não suporta notificações push." };
  }

  if (!("Notification" in window)) {
    return { ok: false, message: "Seu navegador não suporta notificações." };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, message: "Permissão negada para notificações." };
    }

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      return { ok: false, message: "Não foi possível gerar o token." };
    }

    await updateDoc(doc(db, "users", uid), {
      fcmTokens: arrayUnion(token),
    });

    // Listener para notificações em primeiro plano
    onMessage(messaging, (payload) => {
      if (Notification.permission === "granted") {
        new Notification(payload.notification?.title || "Belém Servir", {
          body: payload.notification?.body || "",
          icon: "/logo.png",
        });
      }
    });

    return { ok: true, message: "Notificações ativadas com sucesso!" };
  } catch (err: any) {
    return { ok: false, message: "Erro: " + (err.message || String(err)) };
  }
}

export async function disableNotifications(uid: string, token: string) {
  await updateDoc(doc(db, "users", uid), {
    fcmTokens: arrayRemove(token),
  });
}

export function isNotificationGranted(): boolean {
  if (typeof window === "undefined") return false;
  return "Notification" in window && Notification.permission === "granted";
}
