/**
 * Mapeamento entre Confirmation/Checkin do banco e as formas que a interface
 * consome (mesmos tipos que os antigos stores de localStorage usavam).
 */

export type ConfirmationStatusUi = "confirmado" | "lista_espera" | "cancelado";

const CONF_TO_UI: Record<string, ConfirmationStatusUi> = {
  CONFIRMADO: "confirmado", LISTA_ESPERA: "lista_espera", CANCELADO: "cancelado",
};
const CONF_TO_DB: Record<ConfirmationStatusUi, string> = {
  confirmado: "CONFIRMADO", lista_espera: "LISTA_ESPERA", cancelado: "CANCELADO",
};

export const confStatusToUi = (s: string): ConfirmationStatusUi => CONF_TO_UI[s] ?? "confirmado";
export const confStatusToDb = (s: string): string => CONF_TO_DB[s as ConfirmationStatusUi] ?? "CONFIRMADO";

type DbConfirmation = {
  id: string; eventId: string; name: string; email: string; status: string; createdAt: Date;
};
type DbCheckin = {
  id: string; eventId: string; confirmationId: string | null; name: string; email: string;
  terminal: string; checkedInAt: Date; checkedOutAt: Date | null;
};

export function serializeConfirmation(c: DbConfirmation) {
  return {
    id: c.id,
    eventId: c.eventId,
    name: c.name,
    email: c.email,
    status: confStatusToUi(c.status),
    createdAt: c.createdAt.toISOString(),
  };
}

export function serializeCheckin(c: DbCheckin) {
  return {
    token: c.confirmationId ?? c.id,
    eventId: c.eventId,
    name: c.name,
    email: c.email,
    terminal: c.terminal,
    checkedInAt: c.checkedInAt.toISOString(),
    ...(c.checkedOutAt ? { checkedOutAt: c.checkedOutAt.toISOString() } : {}),
  };
}
