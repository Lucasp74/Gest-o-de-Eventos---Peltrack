/**
 * Reenvia o convite (com QR) para um convidado. Restrito ao dono do evento.
 * Convidados na lista de espera recebem o aviso; cancelados não recebem.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant";
import { sendInviteEmail } from "@/lib/inviteEmail";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const confirmation = await prisma.confirmation.findFirst({
    where: { id, event: { tenantId } },
    include: { event: true },
  });
  if (!confirmation) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  if (confirmation.status === "CANCELADO") {
    return NextResponse.json({ error: "Convite cancelado não pode ser reenviado." }, { status: 400 });
  }

  const res = await sendInviteEmail({
    to: confirmation.email,
    name: confirmation.name,
    token: confirmation.id,
    event: confirmation.event,
    waitlist: confirmation.status === "LISTA_ESPERA",
    // sem idempotência: reenvio deliberado deve sempre disparar
  });

  if (!res.ok) return NextResponse.json({ error: res.error ?? "Falha ao enviar." }, { status: 502 });
  return NextResponse.json({ ok: true, skipped: res.skipped ?? false });
}
