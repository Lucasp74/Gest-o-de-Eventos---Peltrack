/**
 * Atualização de um cliente (tenant) pelo admin — provisionamento de planos.
 * Só o papel "admin" pode usar. Permite mudar plano, limites, flags e gerar
 * chave de API (para clientes Enterprise).
 */
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  }

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

  try {
    const tenant = await prisma.tenant.update({ where: { id }, data });
    return NextResponse.json({ ok: true, apiKey: tenant.apiKey });
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o cliente." }, { status: 500 });
  }
}
