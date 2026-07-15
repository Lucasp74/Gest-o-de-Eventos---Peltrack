/**
 * Dados PÚBLICOS de um evento (página de confirmação /e/[id]).
 * Sem autenticação — devolve só o necessário para o convidado + vagas.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeEvent } from "@/lib/eventMap";
import { feePct } from "@/lib/planPricing";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      tickets: true,
      tenant: { select: { plan: true } },
      _count: { select: { confirmations: true, checkins: true } },
    },
  });
  if (!event) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });

  // "confirmed" público = confirmações ATIVAS (exclui lista de espera e cancelados)
  const confirmed = await prisma.confirmation.count({
    where: { eventId: id, status: "CONFIRMADO" },
  });

  // Taxa de conveniência (%) para o comprador ver o total antes de pagar
  return NextResponse.json({ ...serializeEvent(event), confirmed, feePct: feePct(event.tenant.plan) });
}
