/**
 * Resolve o VÍNCULO do usuário com a organização (qual Tenant e com que papel),
 * a partir da sessão do web (cookie) OU do token do app desktop (Bearer).
 * É por aqui que passa TODA rota autenticada, então é aqui que moram as duas
 * travas de acesso do produto:
 *   1) cliente SUSPENSO não tem vínculo (ver Tenant.suspendedAt);
 *   2) OPERADOR não é DONO, e as rotas de dinheiro, cobrança e configuração
 *      pedem explicitamente o dono.
 *
 * Como a assinatura de getCurrentTenantId não mudou, todas as rotas que já
 * existiam seguem funcionando sem alteração.
 */
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verifyDesktopToken } from "@/lib/desktopToken";

export type Papel = "DONO" | "OPERADOR";
export type Vinculo = { tenantId: string; papel: Papel };

/**
 * CLIENTE SUSPENSO NÃO TEM VÍNCULO.
 * Esta guarda cobre tudo: login por senha, login pelo Google (que não passa
 * pelo authorize) e SESSÕES JÁ ABERTAS, que o nosso JWT sem estado não derruba.
 */
async function vinculoDoUsuario(userId: string): Promise<Vinculo | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      tenantId: true,
      tenantRole: true,
      tenant: { select: { suspendedAt: true } },
    },
  });
  if (!user?.tenantId) return null;
  if (user.tenant?.suspendedAt) return null;
  return { tenantId: user.tenantId, papel: user.tenantRole };
}

/** Vínculo do usuário atual (organização + papel), venha do web ou do desktop. */
export async function getCurrentMembership(): Promise<Vinculo | null> {
  // 1) App desktop — token assinado no header Authorization
  const authorization = (await headers()).get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const payload = verifyDesktopToken(authorization.slice(7).trim());
    return payload ? vinculoDoUsuario(payload.userId) : null;
  }

  // 2) Web — sessão por cookie (Auth.js)
  const session = await auth();
  const userId = session?.user?.id;
  return userId ? vinculoDoUsuario(userId) : null;
}

/** Organização do usuário atual, qualquer que seja o papel. */
export async function getCurrentTenantId(): Promise<string | null> {
  return (await getCurrentMembership())?.tenantId ?? null;
}

/**
 * Organização do usuário atual SE ele for o dono, senão null.
 * Usado pelas rotas que mexem em dinheiro (financeiro, assinatura, Mercado
 * Pago), em configuração da conta e na estrutura dos eventos.
 *
 * POR QUE ISSO É O CORAÇÃO DA FEATURE: antes dos papéis, 18 rotas confiavam
 * apenas em "tem tenant". Convidar alguém para bipar QR na portaria daria a
 * essa pessoa poder de desconectar o Mercado Pago e cancelar a assinatura.
 */
export async function getOwnerTenantId(): Promise<string | null> {
  const vinculo = await getCurrentMembership();
  return vinculo?.papel === "DONO" ? vinculo.tenantId : null;
}
