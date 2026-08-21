/**
 * Os ingressos da própria pessoa, com o QR à mão.
 *
 * Casa por E-MAIL, porque Confirmation não tem vínculo com User: ingresso é
 * preso a um endereço e comprar nem exige cadastro. Isso só é seguro por causa
 * da confirmação de e-mail (11/08): sem ela, alguém se cadastrava com o
 * endereço de outra pessoa e via os ingressos dela. Daí a trava do
 * emailVerified abaixo, que não é decorativa.
 */
import type { Metadata } from "next";
import { Ticket, MapPin, CheckCircle2, Clock } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/dashboard/Sidebar";
import { wallClockNow } from "@/lib/eventMap";

export const metadata: Metadata = { title: "Meus ingressos — Peltrack" };

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const p2 = (n: number) => String(n).padStart(2, "0");

/** Data do evento é "relógio de parede": ler pelos getters UTC, nunca converter. */
const dataDoEvento = (d: Date) =>
  `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}, ${p2(d.getUTCHours())}h${p2(d.getUTCMinutes())}`;

/** Check-in é instante real, então aqui a conversão de fuso é a correta. */
const horaDoCheckin = (d: Date) =>
  d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const SELO = {
  CONFIRMADO: { texto: "Confirmado", classe: "bg-green-50 border-green-200 text-green-700" },
  LISTA_ESPERA: { texto: "Lista de espera", classe: "bg-yellow-50 border-yellow-200 text-yellow-700" },
  CANCELADO: { texto: "Cancelado", classe: "bg-red-50 border-red-200 text-red-600" },
} as const;

export default async function MeusIngressosPage() {
  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, emailVerified: true },
      })
    : null;

  const ingressos =
    user?.emailVerified && user.email
      ? await prisma.confirmation.findMany({
          // insensitive porque o e-mail do ingresso vem de formulário público e
          // o da conta vem do cadastro: nada garante que casem em caixa.
          where: { email: { equals: user.email, mode: "insensitive" } },
          select: {
            id: true,
            status: true,
            event: { select: { name: true, startAt: true, venue: true, city: true, uf: true } },
            checkin: { select: { checkedInAt: true } },
            payment: { select: { ticketType: { select: { name: true } } } },
          },
          orderBy: { event: { startAt: "desc" } },
        })
      : [];

  const agora = wallClockNow();
  const proximos = ingressos.filter((i) => i.event.startAt >= agora).reverse(); // o mais próximo primeiro
  const passados = ingressos.filter((i) => i.event.startAt < agora);

  return (
    <div className="min-h-screen bg-fundo">
      <Sidebar />
      <div className="lg:pl-64 pt-14 lg:pt-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Meus ingressos</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Os eventos em que você se inscreveu, com o QR Code para apresentar na entrada.
            </p>
          </div>

          {ingressos.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-fundo border border-border flex items-center justify-center mx-auto mb-3">
                <Ticket className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-foreground font-medium">Nenhum ingresso por aqui</p>
              <p className="text-muted-foreground text-sm mt-1">
                Quando você se inscrever em um evento com o e-mail{" "}
                <span className="text-foreground font-medium">{user?.email}</span>, ele aparece nesta tela.
              </p>
            </div>
          ) : (
            <>
              <Secao titulo="Próximos eventos" itens={proximos} mostrarQr />
              <Secao titulo="Já aconteceram" itens={passados} />
            </>
          )}

          {/* Limite declarado na tela de propósito: sem isto, quem comprou com
              outro endereço acha que o ingresso sumiu. */}
          <p className="text-xs text-muted-foreground border-t border-border pt-4">
            Esta lista busca pelo e-mail da sua conta ({user?.email}). Ingressos comprados com outro endereço
            não aparecem aqui. Nesse caso, procure o e-mail do convite ou fale com quem organiza o evento.
          </p>
        </div>
      </div>
    </div>
  );
}

type Item = {
  id: string;
  status: keyof typeof SELO;
  event: { name: string; startAt: Date; venue: string | null; city: string | null; uf: string | null };
  checkin: { checkedInAt: Date } | null;
  payment: { ticketType: { name: string } | null } | null;
};

function Secao({ titulo, itens, mostrarQr = false }: { titulo: string; itens: Item[]; mostrarQr?: boolean }) {
  if (itens.length === 0) return null;
  return (
    <section>
      <h2 className="text-foreground font-semibold mb-3">{titulo}</h2>
      <div className="space-y-3">
        {itens.map((i) => {
          const selo = SELO[i.status];
          const local = [i.event.venue, i.event.city, i.event.uf].filter(Boolean).join(", ");
          // QR só faz sentido para quem tem entrada válida: cancelado não entra,
          // e lista de espera ainda não é vaga.
          const comQr = mostrarQr && i.status === "CONFIRMADO";

          return (
            <div key={i.id} className="bg-card rounded-2xl border border-border p-5 flex flex-col sm:flex-row gap-5">
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-foreground font-semibold leading-snug">{i.event.name}</h3>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${selo.classe}`}>
                    {selo.texto}
                  </span>
                </div>

                <p className="text-muted-foreground text-sm mt-2">{dataDoEvento(i.event.startAt)}</p>
                {local && (
                  <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" /> {local}
                  </p>
                )}
                {i.payment?.ticketType && (
                  <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1.5">
                    <Ticket className="w-3.5 h-3.5 flex-shrink-0" /> {i.payment.ticketType.name}
                  </p>
                )}

                {i.checkin ? (
                  <p className="text-green-700 text-sm mt-3 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Entrada registrada em{" "}
                    {horaDoCheckin(i.checkin.checkedInAt)}
                  </p>
                ) : (
                  comQr && (
                    <p className="text-muted-foreground text-sm mt-3 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 flex-shrink-0" /> Apresente o QR Code na entrada
                    </p>
                  )
                )}
              </div>

              {comQr && (
                <div className="flex-shrink-0 self-center">
                  {/* A rota já existe e o token É o segredo: renderizar o QR do
                      próprio ingresso não expõe nada a mais. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/public/qr/${i.id}`}
                    alt={`QR Code do ingresso para ${i.event.name}`}
                    width={132}
                    height={132}
                    className="rounded-xl border border-border bg-white p-1.5"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
