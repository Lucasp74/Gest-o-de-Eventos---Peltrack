"use client";

/**
 * Pusher (lado cliente) — uma única conexão por aba (singleton) e um hook
 * para escutar as mudanças de um evento em tempo real.
 * Sem NEXT_PUBLIC_PUSHER_KEY, o hook não faz nada (fallback: sem tempo real).
 */
import { useEffect, useRef } from "react";
import Pusher from "pusher-js";

let client: Pusher | null = null;

function getPusherClient(): Pusher | null {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  if (!key) return null;
  if (!client) {
    client = new Pusher(key, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "sa1",
      authEndpoint: "/api/pusher/auth",
    });
  }
  return client;
}

/**
 * Executa `onUpdate` sempre que algo muda no evento (confirmação, check-in...).
 * A referência do callback pode mudar a cada render — usamos um ref para não
 * re-assinar o canal à toa.
 */
export function useEventRealtime(eventId: string | undefined, onUpdate: () => void): void {
  const cbRef = useRef(onUpdate);
  cbRef.current = onUpdate;

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher || !eventId) return;

    const channelName = `private-event-${eventId}`;
    const channel = pusher.subscribe(channelName);
    const handler = () => cbRef.current();
    channel.bind("update", handler);

    return () => {
      channel.unbind("update", handler);
      pusher.unsubscribe(channelName);
    };
  }, [eventId]);
}
