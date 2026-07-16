/**
 * Desconecta a conta do Mercado Pago do organizador (limpa os tokens).
 * Depois disso, o organizador não consegue vender ingresso pago até reconectar.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant";

export async function POST() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      mpUserId: null,
      mpAccessToken: null,
      mpRefreshToken: null,
      mpTokenExpiresAt: null,
      mpConnectedAt: null,
    },
  });
  return NextResponse.json({ ok: true });
}
