/**
 * Resolve o Tenant (cliente) do usuário a partir da sessão do web (cookie) OU
 * do token do app desktop (Authorization: Bearer).
 * Usado pelas rotas de API para isolar os dados por cliente (multi-tenant).
 *
 * Como a assinatura não mudou, TODOS os endpoints existentes passaram a
 * atender o desktop sem alteração.
 */
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verifyDesktopToken } from "@/lib/desktopToken";

/**
 * CLIENTE SUSPENSO NÃO TEM TENANT.
 * Esta é a única guarda da suspensão, e ela cobre tudo: login por senha, login
 * pelo Google (que não passa pelo authorize) e SESSÕES JÁ ABERTAS, que o nosso
 * JWT sem estado não derruba. Bloquear só nos logins deixaria essas três portas
 * escancaradas. Custa zero consulta a mais: a busca do usuário já acontecia.
 */
async function tenantDoUsuario(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tenantId: true, tenant: { select: { suspendedAt: true } } },
  });
  if (user?.tenant?.suspendedAt) return null;
  return user?.tenantId ?? null;
}

export async function getCurrentTenantId(): Promise<string | null> {
  // 1) App desktop — token assinado no header Authorization
  const authorization = (await headers()).get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const payload = verifyDesktopToken(authorization.slice(7).trim());
    return payload ? tenantDoUsuario(payload.userId) : null;
  }

  // 2) Web — sessão por cookie (Auth.js)
  const session = await auth();
  const userId = session?.user?.id;
  return userId ? tenantDoUsuario(userId) : null;
}
