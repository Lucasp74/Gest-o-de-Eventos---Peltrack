/**
 * Webhook do Mercado Pago — avisado quando um pagamento muda de estado.
 * Segurança em duas camadas:
 *  1) Assinatura HMAC (header x-signature) validada com MERCADO_PAGO_WEBHOOK_SECRET.
 *  2) Dupla checagem via API (releasePaidPayment com verifyWithApi) — só libera se
 *     o próprio Mercado Pago confirmar "approved". Isso protege mesmo sem o segredo.
 * Responde sempre 200 para o MP não ficar reenviando.
 */
import { NextResponse } from "next/server";
import crypto from "crypto";
import { releasePaidPayment } from "@/lib/paymentRelease";

function isValidSignature(opts: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string;
  secret: string;
}): boolean {
  const { xSignature, xRequestId, dataId, secret } = opts;
  if (!xSignature) return false;
  // x-signature vem como "ts=1699999999,v1=<hash-hex>"
  const parts: Record<string, string> = {};
  for (const piece of xSignature.split(",")) {
    const [k, v] = piece.split("=");
    if (k && v) parts[k.trim()] = v.trim();
  }
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId ?? ""};ts:${ts};`;
  const hmac = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(v1));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  const type =
    (body as { type?: string; topic?: string }).type ??
    (body as { topic?: string }).topic ??
    url.searchParams.get("type") ??
    url.searchParams.get("topic");

  const dataId = String(
    (body as { data?: { id?: string | number } }).data?.id ??
      url.searchParams.get("data.id") ??
      url.searchParams.get("id") ??
      "",
  );

  // Só reagimos a notificações de pagamento
  if (type !== "payment" || !dataId) {
    return NextResponse.json({ received: true });
  }

  // Assinatura (quando o segredo está configurado no .env)
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (secret) {
    const ok = isValidSignature({
      xSignature: req.headers.get("x-signature"),
      xRequestId: req.headers.get("x-request-id"),
      dataId,
      secret,
    });
    if (!ok) return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  // Dupla checagem: só libera se o Mercado Pago confirmar que está aprovado.
  await releasePaidPayment(dataId, { verifyWithApi: true }).catch((e) =>
    console.error("[webhook mercadopago] erro:", e),
  );

  return NextResponse.json({ received: true });
}
