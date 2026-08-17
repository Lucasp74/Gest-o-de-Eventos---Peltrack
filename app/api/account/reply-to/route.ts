/**
 * E-mail que recebe as RESPOSTAS dos convidados (Reply-To dos convites).
 * Vazio = volta a usar o e-mail do dono da conta.
 * Restrito ao cliente logado; sempre escreve no tenant DELE.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirDono } from "@/lib/tenant";

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export async function POST(req: Request) {
  const acesso = await exigirDono();
  if (!acesso.ok) return NextResponse.json({ error: acesso.erro }, { status: acesso.status });
  const tenantId = acesso.tenantId;

  const body = await req.json().catch(() => ({}));
  const email = String(body.replyToEmail ?? "").trim().toLowerCase();

  if (email && !emailOk(email)) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { replyToEmail: email || null }, // vazio → volta pro padrão
  });

  return NextResponse.json({ ok: true, replyToEmail: email || null });
}
