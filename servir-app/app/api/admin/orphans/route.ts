import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lista (e opcionalmente libera) contas de login "órfãs": existem no Firebase Auth
// mas não têm registro na coleção "users" — por isso o e-mail aparece como
// "já cadastrado" mas a pessoa não aparece nas Aprovações.
//
// Uso (precisa estar logado como admin/coordenador):
//   GET /api/admin/orphans                      -> lista os órfãos
//   GET /api/admin/orphans?fix=delete           -> apaga as contas órfãs (libera o e-mail)
export async function GET(req: NextRequest) {
  try {
    const admin = getAdminApp();
    const db = admin.firestore();

    // Autoriza: precisa de um ID token de admin/coordenador
    const authz = req.headers.get("authorization") || "";
    const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    if (!idToken) {
      return NextResponse.json({ error: "Não autorizado (sem token)." }, { status: 401 });
    }
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: "Token inválido." }, { status: 401 });
    }
    const meSnap = await db.collection("users").doc(decoded.uid).get();
    const me = meSnap.data();
    if (!me || (me.role !== "admin" && me.funcao !== "Coordenador")) {
      return NextResponse.json({ error: "Apenas coordenadores." }, { status: 403 });
    }

    // UIDs que TÊM registro em users
    const usersSnap = await db.collection("users").get();
    const withDoc = new Set(usersSnap.docs.map((d) => d.id));

    // Todas as contas de login (Auth), paginando
    const orphans: { uid: string; email?: string; criadoEm?: string }[] = [];
    let pageToken: string | undefined = undefined;
    do {
      const res = await admin.auth().listUsers(1000, pageToken);
      res.users.forEach((u) => {
        if (!withDoc.has(u.uid)) {
          orphans.push({
            uid: u.uid,
            email: u.email,
            criadoEm: u.metadata?.creationTime,
          });
        }
      });
      pageToken = res.pageToken;
    } while (pageToken);

    const fix = req.nextUrl.searchParams.get("fix");
    let apagados = 0;
    if (fix === "delete") {
      for (const o of orphans) {
        try {
          await admin.auth().deleteUser(o.uid);
          apagados++;
        } catch {
          /* ignora */
        }
      }
    }

    return NextResponse.json({
      ok: true,
      totalOrfaos: orphans.length,
      orfaos: orphans,
      apagados: fix === "delete" ? apagados : undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? String(err) }, { status: 500 });
  }
}
