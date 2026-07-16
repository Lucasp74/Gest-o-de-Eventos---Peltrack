/**
 * Integração com o Mercado Pago (cobrança Pix de ingressos + OAuth de split).
 * API clássica /v1/payments, valores em REAIS (decimal).
 *
 * SPLIT: a cobrança é criada com o access token do ORGANIZADOR (que ele
 * conectou via OAuth) e um application_fee = taxa da Peltrack. O MP divide
 * no ato: organizador recebe (preço − taxa), a Peltrack recebe a taxa.
 * Docs: https://www.mercadopago.com.br/developers/pt/docs/checkout-api
 */
import { randomUUID } from "crypto";

const BASE = "https://api.mercadopago.com/v1";
const OAUTH_URL = "https://api.mercadopago.com/oauth/token";

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

/** Cria uma cobrança Pix na conta do organizador (sellerToken), com a taxa da
 *  Peltrack como applicationFee. amountReais é o total (ingresso + taxa). */
export async function createPixCharge(opts: {
  sellerToken: string; // access token do organizador (OAuth)
  applicationFee?: number; // taxa da Peltrack, em reais
  amountReais: number;
  description: string;
  payerEmail: string;
  payerName?: string;
  payerCpf?: string; // só dígitos
  expiresIn?: number; // segundos
}): Promise<PixCharge> {
  const token = opts.sellerToken;
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
    ...(opts.applicationFee && opts.applicationFee > 0
      ? { application_fee: Number(opts.applicationFee.toFixed(2)) }
      : {}),
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

/** Consulta o status de uma cobrança na conta do organizador. */
export async function checkPixCharge(id: string, sellerToken: string): Promise<{ status: string | null }> {
  if (!sellerToken) return { status: null };
  try {
    const res = await fetch(`${BASE}/payments/${encodeURIComponent(id)}`, {
      headers: authHeaders(sellerToken),
    });
    const body = await res.json().catch(() => ({}));
    return { status: normalizeStatus(body?.status) };
  } catch {
    return { status: null };
  }
}

// ─────────────────────────────────────────────────────────────
//  OAuth (split / marketplace) — conexão da conta do organizador
// ─────────────────────────────────────────────────────────────

export type MpTokens = {
  ok: boolean;
  userId?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresInSec?: number;
  error?: string;
};

/** URL para redirecionar o organizador e ele autorizar a Peltrack. */
export function buildAuthorizeUrl(redirectUri: string, state: string): string | null {
  const clientId = process.env.MERCADO_PAGO_CLIENT_ID;
  if (!clientId) return null;
  const p = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    platform_id: "mp",
    state,
    redirect_uri: redirectUri,
  });
  return `https://auth.mercadopago.com/authorization?${p.toString()}`;
}

async function oauthToken(extra: Record<string, string>): Promise<MpTokens> {
  const client_id = process.env.MERCADO_PAGO_CLIENT_ID;
  const client_secret = process.env.MERCADO_PAGO_CLIENT_SECRET;
  if (!client_id || !client_secret) return { ok: false, error: "OAUTH_NAO_CONFIGURADO" };
  try {
    const res = await fetch(OAUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id, client_secret, ...extra }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.access_token) {
      return { ok: false, error: body?.message || body?.error || "Falha no OAuth do Mercado Pago." };
    }
    return {
      ok: true,
      userId: String(body.user_id),
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      expiresInSec: Number(body.expires_in) || undefined,
    };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Troca o code do OAuth pelos tokens do organizador. */
export function exchangeCodeForToken(code: string, redirectUri: string): Promise<MpTokens> {
  return oauthToken({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
}

/** Renova o access token do organizador (o access token expira em ~180 dias). */
export function refreshAccessToken(refreshToken: string): Promise<MpTokens> {
  return oauthToken({ grant_type: "refresh_token", refresh_token: refreshToken });
}
