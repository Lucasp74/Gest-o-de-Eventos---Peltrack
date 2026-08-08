/**
 * Quem "assina" os e-mails de convidado.
 *
 * O remetente CONTINUA sendo o nosso domínio verificado — pôr o e-mail do
 * cliente no "De:" seria falsificação (SPF/DKIM falham e o convite vira spam).
 * O que muda é: o NOME exibido é o da organização e o Reply-To é o e-mail dela,
 * então "Responder" leva o convidado direto ao organizador, sem passar por nós.
 * É como Sympla e Eventbrite fazem.
 */
import { prisma } from "@/lib/prisma";

export type Organizador = { nome: string | null; replyTo: string | null };

const NENHUM: Organizador = { nome: null, replyTo: null };

/**
 * Nome da organização + e-mail que recebe as respostas.
 * O Reply-To é o configurado em Configurações; vazio, cai no e-mail do DONO da
 * conta (usuário mais antigo do tenant) — assim funciona sem ninguém configurar.
 * FAIL-SAFE: qualquer falha devolve vazio e o e-mail sai no padrão Peltrack.
 */
export async function buscarOrganizador(tenantId: string): Promise<Organizador> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        replyToEmail: true,
        users: { orderBy: { createdAt: "asc" }, take: 1, select: { email: true } },
      },
    });
    if (!tenant) return NENHUM;
    return {
      nome: tenant.name,
      replyTo: tenant.replyToEmail?.trim() || tenant.users[0]?.email || null,
    };
  } catch (e) {
    console.error("[organizador] falhou — e-mail sai no padrão Peltrack:", e);
    return NENHUM;
  }
}
