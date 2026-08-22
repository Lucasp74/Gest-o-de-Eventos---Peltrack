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
      // Some junto com o resto: chave de credencial guardada de conta
      // desconectada não serve para nada e só confunde quem ler o banco depois.
      mpPublicKey: null,
      mpTokenExpiresAt: null,
      mpConnectedAt: null,
    },
  });
  return NextResponse.json({ ok: true });
}
