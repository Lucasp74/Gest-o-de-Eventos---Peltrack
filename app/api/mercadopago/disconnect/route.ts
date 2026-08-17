/**
 * Desconecta a conta do Mercado Pago do organizador (limpa os tokens).
 * Depois disso, o organizador não consegue vender ingresso pago até reconectar.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirDono } from "@/lib/tenant";

export async function POST() {
  const acesso = await exigirDono();
  if (!acesso.ok) return NextResponse.json({ error: acesso.erro }, { status: acesso.status });
  const tenantId = acesso.tenantId;

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
