/**
 * Cliente (tenant) no painel admin. Só o papel "admin" entra aqui.
 *  GET    → o que uma exclusão levaria junto (para o modal mostrar antes)
 *  PATCH  → provisionamento (plano, limites, flags, chave de API) e SUSPENSÃO
 *  DELETE → exclusão definitiva, exigindo o nome digitado
 */
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

async function ehAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

const negado = () => NextResponse.json({ error: "Acesso negado." }, { status: 401 });

/** Contagem do estrago, para o admin decidir com número na frente. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await ehAdmin())) return negado();
  const { id } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { id }, select: { name: true } });
  if (!tenant) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

  const [usuarios, eventos, convidados, checkins, pagamentos] = await Promise.all([
    prisma.user.count({ where: { tenantId: id } }),
    prisma.event.count({ where: { tenantId: id } }),
    prisma.confirmation.count({ where: { event: { tenantId: id } } }),
    prisma.checkin.count({ where: { event: { tenantId: id } } }),
    prisma.payment.count({ where: { event: { tenantId: id }, status: "APROVADO" } }),
  ]);

  return NextResponse.json({ nome: tenant.name, usuarios, eventos, convidados, checkins, pagamentos });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await ehAdmin())) return negado();

  const { id } = await params;
  const body = await req.json();
  const data: Prisma.TenantUpdateInput = {};

  if (body.plan) data.plan = body.plan;
  // Valor mensal negociado: número define, null volta ao padrão do plano
  if ("monthlyPrice" in body) {
    data.monthlyPrice = typeof body.monthlyPrice === "number" && body.monthlyPrice >= 0 ? body.monthlyPrice : null;
  }
  if (typeof body.maxEventsPerMonth === "number") data.maxEventsPerMonth = body.maxEventsPerMonth;
  if (typeof body.maxGuestsPerEvent === "number") data.maxGuestsPerEvent = body.maxGuestsPerEvent;
  if (typeof body.flagAdvancedReports === "boolean") data.flagAdvancedReports = body.flagAdvancedReports;
  if (typeof body.flagDesktopSync === "boolean") data.flagDesktopSync = body.flagDesktopSync;
  if (typeof body.flagApiAccess === "boolean") data.flagApiAccess = body.flagApiAccess;
  if (body.generateApiKey === true) data.apiKey = "pk_" + randomBytes(24).toString("hex");
  if (body.removeApiKey === true) data.apiKey = null;
  // Suspender agora, reativar limpando a data. Ver lib/tenant.ts para o efeito.
  if (typeof body.suspended === "boolean") data.suspendedAt = body.suspended ? new Date() : null;

  try {
    const tenant = await prisma.tenant.update({ where: { id }, data });
    return NextResponse.json({ ok: true, apiKey: tenant.apiKey });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o cliente." }, { status: 500 });
  }
}

/**
 * Exclusão definitiva. Existe pela LGPD (pedido de exclusão do titular), não
 * para o dia a dia: para inadimplência e uso indevido, suspender é o certo.
 *
 * Apaga o TENANT, nunca o usuário. A cascata leva usuários, eventos, ingressos,
 * confirmações, check-ins, terminais e pagamentos. Fazer o contrário foi o que
 * deixou uma organização órfã no banco em 11/08: a cascata só corre nesta direção.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await ehAdmin())) return negado();

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const tenant = await prisma.tenant.findUnique({ where: { id }, select: { name: true } });
  if (!tenant) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

  // A confirmação por digitação é conferida NO SERVIDOR. Se ficasse só na tela,
  // uma chamada direta à API apagaria um cliente sem nenhuma barreira.
  if (String(body.confirmName ?? "").trim() !== tenant.name) {
    return NextResponse.json({ error: "O nome digitado não confere." }, { status: 400 });
  }

  try {
    await prisma.tenant.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível excluir o cliente." }, { status: 500 });
  }
}
