/**
 * Token do Mercado Pago do organizador (split de pagamento).
 * Centraliza a leitura do token conectado e a renovação automática quando
 * está perto de expirar — usado por todo o fluxo de cobrança (compra, status,
 * liberação). null = organizador não conectou a conta.
 */
import { prisma } from "@/lib/prisma";
import { refreshAccessToken } from "@/lib/mercadopago";

export async function getValidSellerToken(tenantId: string): Promise<string | null> {
  const t = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { mpAccessToken: true, mpRefreshToken: true, mpTokenExpiresAt: true },
  });
  if (!t?.mpAccessToken) return null;

  // ponytail: renova só quando falta menos de 1 dia pra expirar (token dura ~180 dias).
  const nearExpiry =
    t.mpTokenExpiresAt != null && t.mpTokenExpiresAt.getTime() < Date.now() + 24 * 3600 * 1000;
  if (!nearExpiry || !t.mpRefreshToken) return t.mpAccessToken;

  const r = await refreshAccessToken(t.mpRefreshToken);
  if (!r.ok || !r.accessToken) return t.mpAccessToken; // refresh falhou → segue com o atual

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      mpAccessToken: r.accessToken,
      mpRefreshToken: r.refreshToken ?? t.mpRefreshToken,
      mpTokenExpiresAt: r.expiresInSec ? new Date(Date.now() + r.expiresInSec * 1000) : null,
    },
  });
  return r.accessToken;
}
