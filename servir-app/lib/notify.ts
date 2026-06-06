// Cliente para disparar notificações via API route
type NotifyTarget =
  | { target: "all" }
  | { target: "coordinators" }
  | { target: "uids"; uids: string[] }
  | { target: "members"; memberIds: string[] };

interface NotifyOptions {
  title: string;
  message: string;
  type?: string;
  data?: Record<string, string>;
}

export async function notify(target: NotifyTarget, opts: NotifyOptions) {
  try {
    const res = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...target, ...opts }),
    });
    return await res.json();
  } catch (err) {
    console.error("notify error:", err);
    return { error: String(err) };
  }
}
