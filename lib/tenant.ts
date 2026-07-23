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

async function tenantDoUsuario(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tenantId: true },
  });
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
