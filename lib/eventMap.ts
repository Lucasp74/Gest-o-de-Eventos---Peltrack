/**
 * Mapeamento entre o Event do banco (Prisma) e o EventItem que a interface
 * consome. Datas são tratadas em "wall clock" (UTC-fixo) para preservar
 * exatamente o horário digitado, independente do fuso do servidor.
 */
import type { EventItem, EventStatus } from "@/lib/mockEvents";

const MONTHS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

const p = (n: number) => String(n).padStart(2, "0");

/** "2026-06-12T19:00" → Date (guardando os componentes como UTC). */
export function inputToDate(value: string): Date {
  const [datePart, timePart] = value.split("T");
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi] = (timePart ?? "00:00").split(":").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h || 0, mi || 0));
}

/** Date → "2026-06-12T19:00" (para preencher <input datetime-local>). */
export function dateToInput(date: Date): string {
  return `${date.getUTCFullYear()}-${p(date.getUTCMonth() + 1)}-${p(date.getUTCDate())}T${p(date.getUTCHours())}:${p(date.getUTCMinutes())}`;
}

const STATUS_TO_UI: Record<string, EventStatus> = {
  RASCUNHO: "rascunho", INSCRICOES: "inscricoes", ATIVO: "ativo",
  LOTADO: "lotado", ENCERRADO: "encerrado",
};
const STATUS_TO_DB: Record<EventStatus, string> = {
  rascunho: "RASCUNHO", inscricoes: "INSCRICOES", ativo: "ATIVO",
  lotado: "LOTADO", encerrado: "ENCERRADO",
};

export const statusToUi = (s: string): EventStatus => STATUS_TO_UI[s] ?? "rascunho";
export const statusToDb = (s: EventStatus): string => STATUS_TO_DB[s] ?? "RASCUNHO";

export type Visibility = "publico" | "restrito";
export const visibilityToUi = (v: string): Visibility => (v === "PUBLICO" ? "publico" : "restrito");
export const visibilityToDb = (v: string): string => (v === "publico" ? "PUBLICO" : "RESTRITO");

/** Formato mínimo que o serializador precisa receber do Prisma. */
type DbEvent = {
  id: string;
  name: string;
  imageUrl: string | null;
  startAt: Date;
  venue: string | null;
  city: string | null;
  capacity: number;
  status: string;
  flow: string;
  paid: boolean;
  visibility: string;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
  tickets: { id: string; name: string; price: unknown; quantity: number; sold: number; passFeeToBuyer: boolean }[];
  _count?: { confirmations: number; checkins: number };
};

/** Event (banco) → EventItem (interface). */
export function serializeEvent(e: DbEvent): EventItem {
  return {
    id: e.id,
    name: e.name,
    imageUrl: e.imageUrl ?? undefined,
    date: `${e.startAt.getUTCFullYear()}-${p(e.startAt.getUTCMonth() + 1)}-${p(e.startAt.getUTCDate())}`,
    dateLabel: `${p(e.startAt.getUTCDate())} ${MONTHS[e.startAt.getUTCMonth()]} ${e.startAt.getUTCFullYear()}`,
    time: `${p(e.startAt.getUTCHours())}:${p(e.startAt.getUTCMinutes())}`,
    local: e.venue || e.city || "A definir",
    confirmed: e._count?.confirmations ?? 0,
    capacity: e.capacity,
    checkedIn: e._count?.checkins ?? 0,
    status: statusToUi(e.status),
    flow: e.flow === "EXCEL" ? "excel" : "qrcode",
    paid: e.paid,
    visibility: visibilityToUi(e.visibility),
    ...(e.tickets.length > 0
      ? {
          tickets: e.tickets.map((t) => ({
            id: t.id,
            name: t.name,
            price: Number(t.price),
            quantity: t.quantity,
            sold: t.sold,
            passFeeToBuyer: t.passFeeToBuyer,
          })),
        }
      : {}),
    ...(e.registrationOpensAt ? { registrationOpensAt: dateToInput(e.registrationOpensAt) } : {}),
    ...(e.registrationClosesAt ? { registrationClosesAt: dateToInput(e.registrationClosesAt) } : {}),
  };
}
