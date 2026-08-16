/**
 * Sincronização em lote dos check-ins feitos offline no scanner do desktop.
 *  POST → recebe { checkins: [{ token, terminal, checkedInAt }] } e grava idempotente.
 * confirmationId é @unique → quem sincronizar primeiro vence; duplicados são ignorados.
 * Cada check-in sobe com a HORA LOCAL do scan (checkedInAt), não a hora do envio.
 * Restrito ao dono do evento (mesma regra do check-in avulso).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership, eventoPermitido } from "@/lib/tenant";
import { notifyEvent } from "@/lib/pusherServer";

// Dono enxerga qualquer evento da organizacao; OPERADOR, so onde foi escalado.
// A checagem fica aqui, e nao so na listagem: quem souber o id chamaria esta
// rota direto e receberia dados que a tela escondeu.
async function ownedEvent(id: string) {
  const vinculo = await getCurrentMembership();
  if (!vinculo) return 401 as const;
  const event = (await eventoPermitido(vinculo, id)) ? { id } : null;
  return event ? (200 as const) : (404 as const);
}

type ItemEntrada = { token?: unknown; terminal?: unknown; checkedInAt?: unknown };
type Resultado = { token: string; result: "success" | "duplicate" | "not_found" };

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await ownedEvent(id);
  if (s !== 200) return NextResponse.json({ error: "Sem acesso." }, { status: s });

  const body = await req.json().catch(() => ({}));
  const itens: ItemEntrada[] = Array.isArray(body?.checkins) ? body.checkins : [];

  const resultados: Resultado[] = [];
  let houveSucesso = false;

  // ponytail: loop sequencial (espelha o check-in avulso). A fila offline é pequena
  // — sincroniza aos poucos conforme escaneia online. Vira transação/batch se crescer.
  for (const it of itens) {
    const token = String(it?.token ?? "").trim();
    if (!token) continue;
    const terminal = String(it?.terminal ?? "Desktop").trim() || "Desktop";
    const bruta = it?.checkedInAt ? new Date(String(it.checkedInAt)) : new Date();
    const checkedInAt = isNaN(bruta.getTime()) ? new Date() : bruta;

    const confirmation = await prisma.confirmation.findFirst({ where: { id: token, eventId: id } });
    if (!confirmation || confirmation.status === "CANCELADO") {
      resultados.push({ token, result: "not_found" });
      continue;
    }

    const existing = await prisma.checkin.findUnique({ where: { confirmationId: token } });
    if (existing) {
      resultados.push({ token, result: "duplicate" });
      continue;
    }

    try {
      await prisma.checkin.create({
        data: {
          eventId: id,
          confirmationId: token,
          name: confirmation.name,
          email: confirmation.email,
          terminal,
          checkedInAt,
        },
      });
      houveSucesso = true;
      resultados.push({ token, result: "success" });
    } catch {
      // corrida entre guichês: outro gravou primeiro (viola o unique) → duplicado
      resultados.push({ token, result: "duplicate" });
    }
  }

  if (houveSucesso) await notifyEvent(id, "checkin"); // atualiza os painéis ao vivo
  return NextResponse.json({ resultados });
}
