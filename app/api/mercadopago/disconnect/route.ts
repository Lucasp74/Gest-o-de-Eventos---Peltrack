/**
 * Desconecta a conta do Mercado Pago do organizador (limpa os tokens).
 * Depois disso, o organizador não consegue vender ingresso pago até reconectar.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerTenantId } from "@/lib/tenant";

export async function POST() {
  const tenantId = await getOwnerTenantId();
  if (!tenantId) return NextResponse.json({ error: "Ação restrita ao dono da organização." }, { status: 403 });

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
