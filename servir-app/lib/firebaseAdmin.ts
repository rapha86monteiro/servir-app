import * as admin from "firebase-admin";

let initialized = false;

export function getAdminApp() {
  if (!initialized && !admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
    initialized = true;
  }
  return admin;
}

export async function sendNotificationToTokens(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
) {
  if (tokens.length === 0) return { success: 0, failure: 0 };

  const a = getAdminApp();
  const unique = [...new Set(tokens.filter(Boolean))];

  let successCount = 0;
  let failureCount = 0;
  const invalidTokens: string[] = [];

  // Envio em lotes de 500 (limite FCM)
  for (let i = 0; i < unique.length; i += 500) {
    const batch = unique.slice(i, i + 500);
    try {
      const response = await a.messaging().sendEachForMulticast({
        tokens: batch,
        notification: { title, body },
        data: data ?? {},
        webpush: {
          notification: {
            icon: "/logo.png",
            badge: "/logo.png",
          },
          fcmOptions: {
            link: data?.url || "/app/dashboard",
          },
        },
      });
      successCount += response.successCount;
      failureCount += response.failureCount;

      response.responses.forEach((r, idx) => {
        if (!r.success && (r.error?.code === "messaging/invalid-registration-token" ||
          r.error?.code === "messaging/registration-token-not-registered")) {
          invalidTokens.push(batch[idx]);
        }
      });
    } catch (err) {
      console.error("Erro envio FCM:", err);
      failureCount += batch.length;
    }
  }

  return { success: successCount, failure: failureCount, invalidTokens };
}

export async function getTokensForUsers(uids: string[]): Promise<string[]> {
  if (uids.length === 0) return [];
  const a = getAdminApp();
  const db = a.firestore();
  const tokens: string[] = [];

  // Firestore "in" suporta até 30
  for (let i = 0; i < uids.length; i += 30) {
    const batch = uids.slice(i, i + 30);
    const snap = await db.collection("users").where("uid", "in", batch).get();
    snap.docs.forEach((d) => {
      const data = d.data();
      if (Array.isArray(data.fcmTokens)) tokens.push(...data.fcmTokens);
    });
  }
  return tokens;
}

export async function getAllUserTokens(): Promise<string[]> {
  const a = getAdminApp();
  const db = a.firestore();
  const snap = await db.collection("users").where("status", "==", "approved").get();
  const tokens: string[] = [];
  snap.docs.forEach((d) => {
    const data = d.data();
    if (Array.isArray(data.fcmTokens)) tokens.push(...data.fcmTokens);
  });
  return tokens;
}

export async function getTokensByMemberIds(memberIds: string[]): Promise<string[]> {
  if (memberIds.length === 0) return [];
  const a = getAdminApp();
  const db = a.firestore();
  const tokens: string[] = [];

  // Buscar membros para pegar seus uids
  const uids: string[] = [];
  for (let i = 0; i < memberIds.length; i += 30) {
    const batch = memberIds.slice(i, i + 30);
    const snap = await db.collection("members").where("__name__", "in", batch).get();
    snap.docs.forEach((d) => {
      const data = d.data();
      if (data.uid) uids.push(data.uid);
    });
  }
  if (uids.length > 0) tokens.push(...(await getTokensForUsers(uids)));
  return tokens;
}
