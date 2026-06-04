import { NextRequest, NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { uid } = await req.json();
    if (!uid) {
      return NextResponse.json({ error: "uid obrigatório" }, { status: 400 });
    }

    const admin = getAdminApp();

    // 1. Deleta a conta do Firebase Auth (libera o e-mail)
    try {
      await admin.auth().deleteUser(uid);
    } catch (err: any) {
      // Se já não existir, segue em frente
      if (err.code !== "auth/user-not-found") {
        console.error("Erro ao deletar auth:", err);
      }
    }

    // 2. Deleta o documento do Firestore
    await admin.firestore().collection("users").doc(uid).delete();

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? String(err) }, { status: 500 });
  }
}
