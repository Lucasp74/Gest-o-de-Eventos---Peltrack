/**
 * Motor dos LOTES (Event.batchMode): decide qual TicketType está à venda.
 *
 * Regra de negócio (definida pelo Lucas em 05/08):
 *  · Os lotes formam uma FILA (sortOrder). Só um vale por vez.
 *  · Um lote fecha por ESGOTAMENTO (sold >= quantity, com quantity > 0) ou
 *    pela DATA-LIMITE (closesAt) — o que vier primeiro. Não existe data de
 *    início: um lote abre quando o anterior fecha.
 *  · O VIGENTE é o primeiro da fila ainda aberto. Antes dele = encerrado;
 *    depois dele = futuro. Sem nenhum aberto → vendas encerradas.
 *
 * Datas fora de ordem não quebram a fila: a sequência manda. Um lote futuro
 * com prazo já vencido apenas nasce encerrado quando chegar a vez dele.
 *
 * closesAt segue a convenção wall-clock do eventMap — por isso o "agora"
 * padrão é wallClockNow(), nunca new Date().
 */
import { wallClockNow } from "@/lib/eventMap";

export type BatchState = "vigente" | "encerrado" | "futuro";

type BatchTicket = {
  id: string;
  quantity: number; // 0 = sem limite de estoque (nunca esgota)
  sold: number;
  sortOrder: number;
  closesAt: Date | null;
};

export function resolveBatches<T extends BatchTicket>(
  tickets: T[],
  now: Date = wallClockNow(),
): { ordered: (T & { batchState: BatchState })[]; vigente: (T & { batchState: BatchState }) | null } {
  // sort é estável: empate no sortOrder preserva a ordem vinda do banco
  const fila = [...tickets].sort((a, b) => a.sortOrder - b.sortOrder);

  let vigente: (T & { batchState: BatchState }) | null = null;
  const ordered = fila.map((t) => {
    const esgotado = t.quantity > 0 && t.sold >= t.quantity;
    const vencido = t.closesAt !== null && now > t.closesAt;

    const batchState: BatchState = vigente ? "futuro" : esgotado || vencido ? "encerrado" : "vigente";
    const anotado = { ...t, batchState };
    if (batchState === "vigente") vigente = anotado;
    return anotado;
  });

  return { ordered, vigente };
}
