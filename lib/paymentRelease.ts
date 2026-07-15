/**
 * Liberação de um pagamento aprovado — o coração do "pagou → convite".
 * Chamada tanto pelo webhook do Mercado Pago quanto pela verificação na tela.
 *
 * IDEMPOTENTE: se o pagamento já foi liberado, não faz nada (evita convite e
 * baixa de ingresso duplicados quando o webhook reenvia).
 */
import { prisma } from "@/lib/prisma";
import { checkPixCharge } from "@/lib/mercadopago";
import { sendInviteEmail } from "@/lib/inviteEmail";
import { notifyEvent } from "@/lib/pusherServer";

export type ReleaseResult = { released: boolean; already?: boolean; confirmationId?: string; reason?: string };

export async function releasePaidPayment(
  providerId: string,
  opts: { verifyWithApi?: boolean } = {},
): Promise<ReleaseResult> {
  const payment = await prisma.payment.findUnique({ where: { providerId } });
  if (!payment) return { released: false, reason: "not_found" };

  // Já processado → nada a fazer (idempotência)
  if (payment.status === "APROVADO") {
    return { released: false, already: true, confirmationId: payment.confirmationId ?? undefined };
  }

  // Dupla checagem: confirma com o Mercado Pago que está mesmo pago (anti-fraude)
  if (opts.verifyWithApi) {
    const { status } = await checkPixCharge(providerId);
    if (status !== "PAID") return { released: false, reason: "not_paid_yet" };
  }

  const event = await prisma.event.findUnique({ where: { id: payment.eventId } });
  if (!event) return { released: false, reason: "event_gone" };

  const email = (payment.buyerEmail ?? "").toLowerCase();
  const name = payment.buyerName ?? "Convidado";

  // Cria/atualiza a confirmação do comprador (o token do QR) e amarra ao pagamento.
  const confirmation = await prisma.confirmation.upsert({
    where: { eventId_email: { eventId: payment.eventId, email } },
    update: { name, status: "CONFIRMADO" },
    create: { eventId: payment.eventId, name, email, status: "CONFIRMADO" },
  });

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: "APROVADO", paidAt: new Date(), confirmationId: confirmation.id },
    }),
    // Dá baixa no ingresso (incrementa vendidos)
    ...(payment.ticketTypeId
      ? [prisma.ticketType.update({ where: { id: payment.ticketTypeId }, data: { sold: { increment: 1 } } })]
      : []),
  ]);

  // Envia o convite com QR (idempotência pelo token da confirmação)
  await sendInviteEmail({
    to: email,
    name,
    token: confirmation.id,
    event,
    idempotencyKey: `invite/${confirmation.id}`,
  }).catch((e) => console.error("[release] falha ao enviar convite:", e));

  // Atualiza o painel do organizador ao vivo
  await notifyEvent(payment.eventId, "payment");

  return { released: true, confirmationId: confirmation.id };
}
