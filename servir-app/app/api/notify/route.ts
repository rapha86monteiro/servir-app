import { NextRequest, NextResponse } from "next/server";
import { sendNotificationToTokens, getAllUserTokens, getTokensForUsers, getTokensByMemberIds } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, title, message, target, uids, memberIds, data } = body;

    if (!title || !message) {
      return NextResponse.json({ error: "title e message são obrigatórios" }, { status: 400 });
    }

    let tokens: string[] = [];

    if (target === "all") {
      tokens = await getAllUserTokens();
    } else if (target === "uids" && Array.isArray(uids)) {
      tokens = await getTokensForUsers(uids);
    } else if (target === "members" && Array.isArray(memberIds)) {
      tokens = await getTokensByMemberIds(memberIds);
    } else {
      return NextResponse.json({ error: "target inválido" }, { status: 400 });
    }

    const result = await sendNotificationToTokens(tokens, title, message, {
      ...(data ?? {}),
      type: type ?? "default",
    });

    return NextResponse.json({ ok: true, ...result, tokenCount: tokens.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? String(err) }, { status: 500 });
  }
}
