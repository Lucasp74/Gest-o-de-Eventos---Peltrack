/**
 * Liberação de um pagamento aprovado — o coração do "pagou → convite(s)".
 * Chamada tanto pelo webhook do Mercado Pago quanto pela verificação na tela.
 *
 * Uma compra pode ter N ingressos (payment.quantity) → gera N confirmações
 * (N QRs) e envia um e-mail com todos.
 *
 * IDEMPOTENTE: só o primeiro a virar o pagamento PENDENTE→APROVADO segue
 * (trava atômica), evitando convites e baixa de estoque duplicados quando o
 * webhook reenvia ou a tela consulta ao mesmo tempo.
 */
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { checkPixCharge } from "@/lib/mercadopago";
import { getValidSellerToken } from "@/lib/mpAccount";
import { sendPaidInviteEmail } from "@/lib/inviteEmail";
import { notifyEvent } from "@/lib/pusherServer";

export type ReleaseResult = { released: boolean; already?: boolean; count?: number; reason?: string };

export async function releasePaidPayment(
  providerId: string,
  opts: { verifyWithApi?: boolean } = {},
): Promise<ReleaseResult> {
  const payment = await prisma.payment.findUnique({ where: { providerId } });
  if (!payment) return { released: false, reason: "not_found" };

  // Já processado → nada a fazer (caminho rápido)
  if (payment.status === "APROVADO") return { released: false, already: true };

  const event = await prisma.event.findUnique({ where: { id: payment.eventId } });
  if (!event) return { released: false, reason: "event_gone" };

  // Dupla checagem: confirma com o Mercado Pago (conta do organizador) que está
  // mesmo pago — anti-fraude contra webhook forjado.
  if (opts.verifyWithApi) {
    const sellerToken = await getValidSellerToken(event.tenantId);
    if (!sellerToken) return { released: false, reason: "seller_disconnected" };
    const { status } = await checkPixCharge(providerId, sellerToken);
    if (status !== "PAID") return { released: false, reason: "not_paid_yet" };
  }

  // Trava idempotente atômica: só quem consegue virar PENDENTE→APROVADO libera.
  const flipped = await prisma.payment.updateMany({
    where: { id: payment.id, status: { not: "APROVADO" } },
    data: { status: "APROVADO", paidAt: new Date() },
  });
  if (flipped.count === 0) return { released: false, already: true };

  const email = (payment.buyerEmail ?? "").toLowerCase();
  const name = payment.buyerName ?? "Convidado";
  const qty = payment.quantity > 0 ? payment.quantity : 1;
  // Gera os N tokens (ids das confirmações = tokens dos QRs) no app, para já
  // conhecê-los na hora de montar o e-mail.
  const tokens = Array.from({ length: qty }, () => randomUUID());

  // Cria as N confirmações (N QRs) e dá baixa de N no estoque.
  await prisma.$transaction([
    prisma.confirmation.createMany({
      data: tokens.map((id) => ({
        id,
        eventId: payment.eventId,
        name,
        email,
        status: "CONFIRMADO" as const,
        paymentId: payment.id,
      })),
    }),
    ...(payment.ticketTypeId
      ? [prisma.ticketType.update({ where: { id: payment.ticketTypeId }, data: { sold: { increment: qty } } })]
      : []),
  ]);

  // Um e-mail com os N ingressos (QRs). Idempotência pelo id do pagamento.
  await sendPaidInviteEmail({
    to: email,
    name,
    tokens,
    event,
    idempotencyKey: `invite/${payment.id}`,
  }).catch((e) => console.error("[release] falha ao enviar convite:", e));

  // Atualiza o painel do organizador ao vivo
  await notifyEvent(payment.eventId, "payment");

  return { released: true, count: qty };
}
