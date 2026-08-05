/**
 * Dados PÚBLICOS de um evento (página de confirmação /e/[id]).
 * Sem autenticação — devolve só o necessário para o convidado + vagas.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeEvent } from "@/lib/eventMap";
import { feePct } from "@/lib/planPricing";
import { resolveBatches } from "@/lib/batches";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      tickets: { orderBy: { sortOrder: "asc" } },
      tenant: { select: { plan: true } },
      _count: { select: { confirmations: true, checkins: true } },
    },
  });
  if (!event) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });

  // "confirmed" público = confirmações ATIVAS (exclui lista de espera e cancelados)
  const confirmed = await prisma.confirmation.count({
    where: { eventId: id, status: "CONFIRMADO" },
  });

  const serialized = serializeEvent(event);

  // Modo lotes: quem decide qual lote vale é o SERVIDOR (relógio e regra únicos).
  // A vitrine só desenha o que vier daqui — nunca recalcula a vigência.
  if (event.batchMode && serialized.tickets) {
    const { ordered } = resolveBatches(event.tickets);
    const estado = new Map(ordered.map((t) => [t.id, t.batchState]));
    serialized.tickets = serialized.tickets.map((t) => ({ ...t, batchState: estado.get(t.id) }));
  }

  // Taxa de conveniência (%) para o comprador ver o total antes de pagar
  return NextResponse.json({ ...serialized, confirmed, feePct: feePct(event.tenant.plan) });
}
