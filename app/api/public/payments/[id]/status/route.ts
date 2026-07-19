/**
 * Verificação pública do status de um pagamento (a tela do Pix consulta aqui).
 * Se ainda pendente, checa no Mercado Pago; se estiver PAGO, dispara a liberação
 * (convite + baixa no ingresso) na hora. Serve de teste local e de rede de
 * segurança caso o webhook atrase/falhe.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkPixCharge } from "@/lib/mercadopago";
import { getValidSellerToken } from "@/lib/mpAccount";
import { releasePaidPayment } from "@/lib/paymentRelease";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payment = await prisma.payment.findUnique({
    where: { id },
    select: { status: true, providerId: true, event: { select: { tenantId: true } } },
  });
  if (!payment) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  if (payment.status === "APROVADO") {
    return NextResponse.json({ status: "aprovado" });
  }

  const sellerToken = payment.providerId ? await getValidSellerToken(payment.event.tenantId) : null;
  if (payment.providerId && sellerToken) {
    const { status } = await checkPixCharge(payment.providerId, sellerToken);
    if (status === "PAID") {
      await releasePaidPayment(payment.providerId);
      return NextResponse.json({ status: "aprovado" });
    }
    if (status === "EXPIRED") return NextResponse.json({ status: "expirado" });
  }

  return NextResponse.json({ status: "pendente" });
}
