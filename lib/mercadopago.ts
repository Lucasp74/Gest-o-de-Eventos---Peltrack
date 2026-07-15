/**
 * Integração com o Mercado Pago (cobrança Pix de ingressos).
 * API clássica /v1/payments, valores em REAIS (decimal). Sem
 * MERCADO_PAGO_ACCESS_TOKEN, retorna indisponível (o evento pago mostra aviso,
 * mas o sistema não quebra).
 * Docs: https://www.mercadopago.com.br/developers/pt/docs/checkout-api
 */
import { randomUUID } from "crypto";

const BASE = "https://api.mercadopago.com/v1";

function authHeaders(token: string, idempotencyKey?: string): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) h["X-Idempotency-Key"] = idempotencyKey;
  return h;
}

/** Normaliza os status do MP para os mesmos rótulos que o resto do app usa. */
function normalizeStatus(mpStatus: string | null | undefined): string | null {
  switch (mpStatus) {
    case "approved":
      return "PAID";
    case "pending":
    case "in_process":
    case "authorized":
      return "PENDING";
    case "cancelled":
    case "expired":
      return "EXPIRED";
    case "rejected":
      return "REJECTED";
    default:
      return mpStatus ? mpStatus.toUpperCase() : null;
  }
}

export type PixCharge = {
  ok: boolean;
  id?: string;
  brCode?: string; // copia-e-cola (EMV)
  brCodeBase64?: string; // imagem do QR como data URL
  expiresAt?: string;
  error?: string;
};

/** Cria uma cobrança Pix. amountReais é o total (ingresso + taxa). */
export async function createPixCharge(opts: {
  amountReais: number;
  description: string;
  payerEmail: string;
  payerName?: string;
  payerCpf?: string; // só dígitos
  expiresIn?: number; // segundos
}): Promise<PixCharge> {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) return { ok: false, error: "PAGAMENTO_INDISPONIVEL" };

  // Nome → first_name / last_name (o MP pede ambos no Pix)
  const parts = (opts.payerName ?? "").trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "Comprador";
  const lastName = parts.slice(1).join(" ") || firstName;

  const cpf = (opts.payerCpf ?? "").replace(/\D/g, "");
  const expiresIn = opts.expiresIn ?? 3600;
  const dateOfExpiration = new Date(Date.now() + expiresIn * 1000).toISOString();

  const payload: Record<string, unknown> = {
    transaction_amount: Number(opts.amountReais.toFixed(2)),
    description: opts.description.slice(0, 255),
    payment_method_id: "pix",
    date_of_expiration: dateOfExpiration,
    payer: {
      email: opts.payerEmail,
      first_name: firstName,
      last_name: lastName,
      ...(cpf.length === 11 ? { identification: { type: "CPF", number: cpf } } : {}),
    },
  };

  try {
    const res = await fetch(`${BASE}/payments`, {
      method: "POST",
      headers: authHeaders(token, randomUUID()),
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.id) {
      // O MP devolve { message, cause: [...] } — propaga pra facilitar o diagnóstico.
      const msg = body?.message || body?.error || "Falha ao gerar a cobrança Pix.";
      return { ok: false, error: msg };
    }
    const tx = body?.point_of_interaction?.transaction_data ?? {};
    const base64 = tx.qr_code_base64
      ? `data:image/png;base64,${tx.qr_code_base64}`
      : undefined;
    return {
      ok: true,
      id: String(body.id),
      brCode: tx.qr_code,
      brCodeBase64: base64,
      expiresAt: body.date_of_expiration ?? dateOfExpiration,
    };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Consulta o status de uma cobrança. Retorna o status normalizado (PAID/PENDING/EXPIRED...). */
export async function checkPixCharge(id: string): Promise<{ status: string | null }> {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) return { status: null };
  try {
    const res = await fetch(`${BASE}/payments/${encodeURIComponent(id)}`, {
      headers: authHeaders(token),
    });
    const body = await res.json().catch(() => ({}));
    return { status: normalizeStatus(body?.status) };
  } catch {
    return { status: null };
  }
}
