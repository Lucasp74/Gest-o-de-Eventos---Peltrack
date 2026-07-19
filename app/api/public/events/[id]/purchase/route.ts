/**
 * Compra PÚBLICA de ingresso pago: gera a cobrança Pix (Mercado Pago) e registra
 * um Payment PENDENTE com os dados do comprador. Suporta N ingressos por compra
 * (respeitando mín/máx do ingresso e o estoque). Os convites (N QRs) só são
 * liberados quando o pagamento é confirmado — via WEBHOOK (tarefa de 09/07).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPixCharge } from "@/lib/mercadopago";
import { getValidSellerToken } from "@/lib/mpAccount";
import { ticketCharge } from "@/lib/planPricing";

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await _req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const cpf = String(body.cpf ?? "").replace(/\D/g, "");
  const ticketTypeId = String(body.ticketTypeId ?? "");
  const quantity = Math.floor(Number(body.quantity ?? 1));

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

  // Estoque disponível (0 = ilimitado) e limites por compra.
  const available = ticket.quantity > 0 ? ticket.quantity - ticket.sold : Infinity;
  if (available <= 0) {
    return NextResponse.json({ error: "Ingresso esgotado.", code: "SOLD_OUT" }, { status: 409 });
  }
  const min = ticket.minPerOrder > 0 ? ticket.minPerOrder : 1;
  const max = ticket.maxPerOrder > 0 ? ticket.maxPerOrder : Infinity;
  if (!Number.isFinite(quantity) || quantity < 1) {
    return NextResponse.json({ error: "Quantidade inválida." }, { status: 400 });
  }
  if (quantity < min) {
    return NextResponse.json({ error: `Mínimo de ${min} ingresso(s) por compra.`, code: "MIN" }, { status: 400 });
  }
  if (quantity > max) {
    return NextResponse.json({ error: `Máximo de ${max} ingresso(s) por compra.`, code: "MAX" }, { status: 400 });
  }
  if (quantity > available) {
    return NextResponse.json({ error: `Restam apenas ${available} ingresso(s).`, code: "STOCK" }, { status: 409 });
  }

  // Split: a cobrança sai na conta do organizador. Sem conexão MP, não há como vender.
  const sellerToken = await getValidSellerToken(event.tenantId);
  if (!sellerToken) {
    return NextResponse.json(
      { error: "Este organizador ainda não habilitou o recebimento de pagamentos." },
      { status: 503 },
    );
  }

  // Valor por unidade depende de quem paga a taxa; total = unidade × quantidade.
  const ticketPrice = Number(ticket.price);
  const { fee: unitFee, buyerTotal: unitTotal } = ticketCharge(event.tenant.plan, ticketPrice, ticket.passFeeToBuyer);
  const fee = Math.round(unitFee * quantity * 100) / 100;     // taxa total (receita Peltrack)
  const total = Math.round(unitTotal * quantity * 100) / 100; // valor total cobrado

  const charge = await createPixCharge({
    sellerToken,
    applicationFee: fee, // taxa total da Peltrack — o MP separa no ato do pagamento
    amountReais: total,
    description: `${event.name} — ${ticket.name}${quantity > 1 ? ` (${quantity}x)` : ""}`,
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
      quantity,
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
    quantity,
    ticketPrice,          // preço unitário
    subtotal: Math.round(ticketPrice * quantity * 100) / 100,
    fee,
    total,
    passFeeToBuyer: ticket.passFeeToBuyer,
    expiresAt: charge.expiresAt,
  }, { status: 201 });
}
