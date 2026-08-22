/**
 * Retorno do OAuth do Mercado Pago (split). Valida o `state`, troca o `code`
 * pelos tokens do organizador e salva no Tenant. Redireciona de volta para
 * Configurações com um status na query (?mp=...).
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/tenant";
import { exchangeCodeForToken, getPlatformUserId } from "@/lib/mercadopago";

function back(req: Request, status: string) {
  const res = NextResponse.redirect(new URL(`/dashboard/configuracoes?mp=${status}`, req.url));
  res.cookies.delete("mp_oauth_state");
  return res;
}

export async function GET(req: Request) {
  const vinculo = await getCurrentMembership();
  if (!vinculo) return NextResponse.redirect(new URL("/login", req.url));
  // Mesma trava do /connect. Repetida aqui de propósito: o callback é uma URL
  // pública, e depender só da trava da porta de entrada deixaria este caminho
  // aberto para quem chegasse direto nele.
  if (vinculo.papel !== "DONO") return back(req, "sem_permissao");
  const tenantId = vinculo.tenantId;

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = (await cookies()).get("mp_oauth_state")?.value;

  if (!code || !state || !savedState || state !== savedState) {
    console.error("[mp callback] state invalido", {
      hasCode: !!code,
      hasState: !!state,
      hasSavedState: !!savedState,
      match: state === savedState,
    });
    return back(req, "erro");
  }

  const redirectUri = new URL("/api/mercadopago/callback", req.url).toString();
  const r = await exchangeCodeForToken(code, redirectUri);
  if (!r.ok || !r.accessToken || !r.userId) {
    console.error("[mp callback] troca de token falhou:", r.error);
    return back(req, "erro");
  }

  // Conectou a conta da PRÓPRIA Peltrack: aceita, mas registra. Essas vendas
  // saem sem taxa (o MP proíbe application_fee quando quem recebe é a dona da
  // aplicação), e é melhor saber disso aqui do que na tela de um comprador.
  const nossa = await getPlatformUserId();
  if (nossa && nossa === r.userId) {
    console.warn("[mp callback] conta da plataforma conectada como organizador", { tenantId });
  }

  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        mpUserId: r.userId,
        mpAccessToken: r.accessToken,
        mpRefreshToken: r.refreshToken ?? null,
        mpPublicKey: r.publicKey ?? null,
        mpTokenExpiresAt: r.expiresInSec ? new Date(Date.now() + r.expiresInSec * 1000) : null,
        mpConnectedAt: new Date(),
      },
    });
  } catch {
    // mpUserId é @unique: a mesma conta MP já está ligada a outro cadastro.
    return back(req, "conta_em_uso");
  }

  return back(req, "conectado");
}
