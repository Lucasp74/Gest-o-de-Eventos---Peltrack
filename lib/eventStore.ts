/**
 * ⚠️ TEMPORÁRIO — ponte de persistência via localStorage.
 *
 * Permite que eventos criados no formulário apareçam na lista durante o
 * desenvolvimento, sem backend. Será substituído por Neon + Prisma na Fase 1.
 * Os dados ficam apenas no navegador do usuário.
 */

import { MOCK_EVENTS, type EventItem } from "./mockEvents";

const KEY = "eventpass:events";
const DELETED_KEY = "eventpass:deleted_events";

const MONTHS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/** Converte um valor datetime-local (ex.: "2026-06-12T19:00") em rótulos. */
export function formatEventDate(startAt: string): { date: string; dateLabel: string; time: string } {
  const [datePart, timePart] = startAt.split("T");
  const [y, m, d] = datePart.split("-");
  return {
    date: datePart,
    dateLabel: `${d} ${MONTHS[Number(m) - 1]} ${y}`,
    time: timePart?.slice(0, 5) ?? "",
  };
}

/** Eventos criados pelo usuário (somente os salvos no navegador). */
export function getStoredEvents(): EventItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as EventItem[]) : [];
  } catch {
    return [];
  }
}

function getDeletedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Lista completa: eventos salvos (criados/editados) têm precedência sobre os
 * exemplos de mesmo id; exemplos excluídos são omitidos.
 */
export function getAllEvents(): EventItem[] {
  const stored = getStoredEvents();
  const storedIds = new Set(stored.map((e) => e.id));
  const deleted = new Set(getDeletedIds());
  return [
    ...stored,
    ...MOCK_EVENTS.filter((e) => !storedIds.has(e.id)),
  ].filter((e) => !deleted.has(e.id));
}

/** Adiciona um evento ao início da lista no localStorage. */
export function addEvent(event: EventItem): void {
  if (typeof window === "undefined") return;
  const stored = getStoredEvents();
  localStorage.setItem(KEY, JSON.stringify([event, ...stored]));
}

/** Atualiza um evento (cria override no localStorage, inclusive para exemplos). */
export function updateEvent(event: EventItem): void {
  if (typeof window === "undefined") return;
  const stored = getStoredEvents();
  const idx = stored.findIndex((e) => e.id === event.id);
  if (idx >= 0) stored[idx] = event;
  else stored.unshift(event);
  localStorage.setItem(KEY, JSON.stringify(stored));
}

/** Exclui um evento (remove do storage e marca como excluído, cobrindo exemplos). */
export function deleteEvent(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    KEY,
    JSON.stringify(getStoredEvents().filter((e) => e.id !== id)),
  );
  const del = getDeletedIds();
  if (!del.includes(id)) {
    localStorage.setItem(DELETED_KEY, JSON.stringify([...del, id]));
  }
}
