/**
 * Acesso (client-side) aos dados de presença do evento via API — substitui os
 * antigos stores de localStorage (confirmationStore/checkinStore/terminalStore).
 */
import type { EventItem } from "@/lib/mockEvents";

export type ConfirmationStatus = "confirmado" | "lista_espera" | "cancelado";

export interface Confirmation {
  id: string; // token do QR Code
  eventId: string;
  name: string;
  email: string;
  status: ConfirmationStatus;
  createdAt: string;
}

export interface CheckinRecord {
  token: string;
  eventId: string;
  name: string;
  email: string;
  terminal: string;
  checkedInAt: string;
  checkedOutAt?: string;
}

export type ScanResult = {
  result: "success" | "duplicate" | "not_found";
  name?: string;
  usedAt?: string;
  terminal?: string;
};

export const DEFAULT_TERMINALS = ["Guichê 1", "Guichê 2", "Guichê 3", "Guichê 4"];

/* ── Público (página /e/[id]) ─────────────────────────── */
export async function fetchPublicEvent(id: string): Promise<EventItem | null> {
  const res = await fetch(`/api/public/events/${id}`);
  return res.ok ? res.json() : null;
}

export async function confirmPresence(
  eventId: string,
  data: { name: string; email: string },
): Promise<{ ok: boolean; code?: string; error?: string; confirmation?: Confirmation }> {
  const res = await fetch(`/api/public/events/${eventId}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  return res.ok ? { ok: true, confirmation: body } : { ok: false, code: body.code, error: body.error };
}

/* ── Organizador ──────────────────────────────────────── */
export async function fetchConfirmations(eventId: string): Promise<Confirmation[]> {
  const res = await fetch(`/api/events/${eventId}/confirmations`);
  return res.ok ? res.json() : [];
}

export async function fetchCheckins(eventId: string): Promise<CheckinRecord[]> {
  const res = await fetch(`/api/events/${eventId}/checkins`);
  return res.ok ? res.json() : [];
}

export async function addGuest(
  eventId: string,
  data: { name: string; email: string },
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/events/${eventId}/confirmations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (res.ok) return { ok: true };
  const body = await res.json().catch(() => ({}));
  return { ok: false, error: body.error };
}

export async function updateConfirmationStatus(
  confirmationId: string,
  status: ConfirmationStatus,
): Promise<boolean> {
  const res = await fetch(`/api/confirmations/${confirmationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return res.ok;
}

/** Reenvia o convite (com QR) por e-mail. `skipped` = dev sem chave do Resend. */
export async function resendInvite(
  confirmationId: string,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const res = await fetch(`/api/confirmations/${confirmationId}/resend`, { method: "POST" });
  const body = await res.json().catch(() => ({}));
  return res.ok ? { ok: true, skipped: body.skipped } : { ok: false, error: body.error };
}

/** Registra um check-in a partir do token do QR. Usado pelo scanner e pelo check-in manual. */
export async function scanCheckin(eventId: string, token: string, terminal: string): Promise<ScanResult> {
  const res = await fetch(`/api/events/${eventId}/checkins`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, terminal }),
  });
  return res.ok ? res.json() : { result: "not_found" };
}

export async function undoCheckin(eventId: string, token: string): Promise<boolean> {
  const res = await fetch(`/api/events/${eventId}/checkins?token=${encodeURIComponent(token)}`, {
    method: "DELETE",
  });
  return res.ok;
}

export async function fetchTerminals(eventId: string): Promise<string[]> {
  const res = await fetch(`/api/events/${eventId}/terminals`);
  return res.ok ? res.json() : [...DEFAULT_TERMINALS];
}

export async function saveTerminals(eventId: string, names: string[]): Promise<string[]> {
  const res = await fetch(`/api/events/${eventId}/terminals`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ names }),
  });
  return res.ok ? res.json() : names;
}
