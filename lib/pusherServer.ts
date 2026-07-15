/**
 * Pusher (lado servidor) — dispara avisos de tempo real por evento.
 * Se as chaves não estiverem no .env, tudo vira no-op: o sistema segue
 * funcionando normalmente, só sem atualização ao vivo.
 */
import Pusher from "pusher";

let pusher: Pusher | null = null;

export function getPusherServer(): Pusher | null {
  if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_SECRET) return null;
  if (!pusher) {
    pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER || "sa1",
      useTLS: true,
    });
  }
  return pusher;
}

/** Nome do canal privado de um evento. */
export const eventChannel = (eventId: string) => `private-event-${eventId}`;

/**
 * Avisa os clientes conectados que algo mudou no evento. Não bloqueia nem
 * quebra o fluxo se o Pusher falhar/estiver desativado.
 */
export async function notifyEvent(eventId: string, type: string): Promise<void> {
  const p = getPusherServer();
  if (!p) return;
  try {
    await p.trigger(eventChannel(eventId), "update", { type, at: Date.now() });
  } catch (e) {
    console.error("[pusher] falha ao notificar:", e);
  }
}
