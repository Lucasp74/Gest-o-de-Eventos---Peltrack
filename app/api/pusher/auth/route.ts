/**
 * Autenticação do canal privado do Pusher.
 * Só autoriza a escutar `private-event-<id>` quem é DONO daquele evento
 * (tenant logado) — garante que um cliente não veja os dados de outro.
 */
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant";
import { getPusherServer, eventChannel } from "@/lib/pusherServer";

export async function POST(req: Request) {
  const pusher = getPusherServer();
  if (!pusher) return new Response("Tempo real desativado.", { status: 501 });

  const form = await req.formData();
  const socketId = String(form.get("socket_id") ?? "");
  const channel = String(form.get("channel_name") ?? "");

  const match = channel.match(/^private-event-(.+)$/);
  if (!socketId || !match) return new Response("Requisição inválida.", { status: 400 });
  const eventId = match[1];

  const tenantId = await getCurrentTenantId();
  if (!tenantId) return new Response("Não autenticado.", { status: 401 });

  const owned = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
    select: { id: true },
  });
  if (!owned || channel !== eventChannel(eventId)) {
    return new Response("Sem acesso a este evento.", { status: 403 });
  }

  const auth = pusher.authorizeChannel(socketId, channel);
  return Response.json(auth);
}
