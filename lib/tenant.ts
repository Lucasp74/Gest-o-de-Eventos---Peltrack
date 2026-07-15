/**
 * Resolve o Tenant (cliente) do usuário logado a partir da sessão.
 * Usado pelas rotas de API para isolar os dados por cliente (multi-tenant).
 */
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentTenantId(): Promise<string | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tenantId: true },
  });
  return user?.tenantId ?? null;
}
