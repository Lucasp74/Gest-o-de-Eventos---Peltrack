/**
 * Início do OAuth do Mercado Pago (split). Gera um `state` anti-fraude (guardado
 * em cookie httpOnly) e redireciona o organizador para autorizar a Peltrack.
 * O retorno cai em /api/mercadopago/callback.
 */
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { getCurrentTenantId } from "@/lib/tenant";
import { buildAuthorizeUrl } from "@/lib/mercadopago";

export async function GET(req: Request) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return NextResponse.redirect(new URL("/login", req.url));

  const state = randomBytes(16).toString("hex");
  const redirectUri = new URL("/api/mercadopago/callback", req.url).toString();
  const authUrl = buildAuthorizeUrl(redirectUri, state);
  if (!authUrl) {
    return NextResponse.redirect(new URL("/dashboard/configuracoes?mp=indisponivel", req.url));
  }

  const jar = await cookies();
  jar.set("mp_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 min (mesma validade do code)
  });

  return NextResponse.redirect(authUrl);
}
