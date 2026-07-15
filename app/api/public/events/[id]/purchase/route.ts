/**
 * Compra PÚBLICA de ingresso pago: gera a cobrança Pix (Mercado Pago) e registra
 * um Payment PENDENTE com os dados do comprador. O convite (QR) só é liberado
 * quando o pagamento é confirmado — via WEBHOOK (tarefa de 09/07).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPixCharge } from "@/lib/mercadopago";
import { ticketCharge } from "@/lib/planPricing";

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await _req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const cpf = String(body.cpf ?? "").replace(/\D/g, "");
  const ticketTypeId = String(body.ticketTypeId ?? "");

  if (!name || !emailOk(email)) {
    return NextResponse.json({ error: "Nome e e-mail válidos são obrigatórios." }, { status: 400 });
  }
  // O Pix do Mercado Pago exige o CPF do pagador.
  if (cpf.length !== 11) {
    return NextResponse.json({ error: "Informe um CPF válido (11 dígitos)." }, { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { id },
    include: { tenant: { select: { plan: true } }, tickets: true },
  });
  if (!event) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
  if (!event.paid) return NextResponse.json({ error: "Este evento é gratuito." }, { status: 400 });

  const ticket = event.tickets.find((t) => t.id === ticketTypeId);
  if (!ticket) return NextResponse.json({ error: "Ingresso inválido." }, { status: 400 });
  if (ticket.quantity > 0 && ticket.sold >= ticket.quantity) {
    return NextResponse.json({ error: "Ingresso esgotado.", code: "SOLD_OUT" }, { status: 409 });
  }

  // Valor cobrado depende de quem paga a taxa (escolha do criador no ingresso):
  // repassada → comprador paga preço + taxa; absorvida → comprador paga só o preço.
  const ticketPrice = Number(ticket.price);
  const { fee, buyerTotal: total } = ticketCharge(event.tenant.plan, ticketPrice, ticket.passFeeToBuyer);

  const charge = await createPixCharge({
    amountReais: total,
    description: `${event.name} — ${ticket.name}`,
    payerEmail: email,
    payerName: name,
    payerCpf: cpf,
  });
  if (!charge.ok || !charge.id) {
    const msg = charge.error === "PAGAMENTO_INDISPONIVEL"
      ? "Pagamento indisponível no momento. Tente mais tarde."
      : charge.error ?? "Não foi possível gerar a cobrança.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const payment = await prisma.payment.create({
    data: {
      eventId: id,
      ticketTypeId: ticket.id,
      buyerName: name,
      buyerEmail: email,
      amount: total,
      feeAmount: fee,
      status: "PENDENTE",
      providerId: charge.id,
      brCode: charge.brCode ?? null,
      expiresAt: charge.expiresAt ? new Date(charge.expiresAt) : null,
    },
  });

  return NextResponse.json({
    paymentId: payment.id,
    brCode: charge.brCode,
    brCodeBase64: charge.brCodeBase64,
    ticketPrice,
    fee,
    total,
    passFeeToBuyer: ticket.passFeeToBuyer,
    expiresAt: charge.expiresAt,
  }, { status: 201 });
}
