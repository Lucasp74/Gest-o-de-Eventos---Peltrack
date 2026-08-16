/**
 * Início do OAuth do Mercado Pago (split). Gera um `state` anti-fraude (guardado
 * em cookie httpOnly) e redireciona o organizador para autorizar a Peltrack.
 * O retorno cai em /api/mercadopago/callback.
 */
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getCurrentMembership } from "@/lib/tenant";
import { buildAuthorizeUrl } from "@/lib/mercadopago";

export async function GET(req: Request) {
  const vinculo = await getCurrentMembership();
  if (!vinculo) return NextResponse.redirect(new URL("/login", req.url));
  // Conectar a conta bancária da organização é ato exclusivo do dono.
  if (vinculo.papel !== "DONO") {
    return NextResponse.redirect(new URL("/dashboard/configuracoes?mp=sem_permissao", req.url));
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = new URL("/api/mercadopago/callback", req.url).toString();
  const authUrl = buildAuthorizeUrl(redirectUri, state);
  if (!authUrl) {
    return NextResponse.redirect(new URL("/dashboard/configuracoes?mp=indisponivel", req.url));
  }

  const res = NextResponse.redirect(authUrl);
  // O cookie precisa ir NO response do redirect (setar via cookies() não anexa aqui).
  res.cookies.set("mp_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 min (mesma validade do code)
  });
  return res;
}
