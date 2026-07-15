/**
 * Simula o pagamento de um Pix — APENAS em desenvolvimento.
 * O Mercado Pago não oferece um "simular pagamento" de Pix, então aqui a gente
 * libera o pagamento direto (sem checar a API) para testar toda a cadeia
 * "pagou → convite com QR + baixa no ingresso" localmente. Bloqueado em produção.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releasePaidPayment } from "@/lib/paymentRelease";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Indisponível." }, { status: 403 });
  }

  const { id } = await params;
  const payment = await prisma.payment.findUnique({
    where: { id },
    select: { providerId: true },
  });
  if (!payment?.providerId) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const r = await releasePaidPayment(payment.providerId, { verifyWithApi: false });
  return NextResponse.json({ ok: r.released || r.already === true, status: "aprovado" });
}
