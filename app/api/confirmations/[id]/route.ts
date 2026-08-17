/**
 * Altera o status de uma confirmação (confirmar da lista de espera, cancelar,
 * reativar). Restrito ao dono do evento.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirDono } from "@/lib/tenant";
import { serializeConfirmation, confStatusToDb } from "@/lib/presenceMap";
import { notifyEvent } from "@/lib/pusherServer";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const acesso = await exigirDono();
  if (!acesso.ok) return NextResponse.json({ error: acesso.erro }, { status: acesso.status });
  const tenantId = acesso.tenantId;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = String(body.status ?? "");
  if (!["confirmado", "lista_espera", "cancelado"].includes(status)) {
    return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  }

  // Confirma que a confirmação pertence a um evento do tenant
  const confirmation = await prisma.confirmation.findFirst({
    where: { id, event: { tenantId } },
    select: { id: true, eventId: true },
  });
  if (!confirmation) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const updated = await prisma.confirmation.update({
    where: { id },
    data: { status: confStatusToDb(status) as "CONFIRMADO" | "LISTA_ESPERA" | "CANCELADO" },
  });
  await notifyEvent(confirmation.eventId, "status");
  return NextResponse.json(serializeConfirmation(updated));
}
