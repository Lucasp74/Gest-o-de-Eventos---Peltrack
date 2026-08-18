import { cache } from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import ConfirmationFlow from "@/components/public/ConfirmationFlow";
import { urlAbsoluta, SITE_NAME } from "@/lib/site";

/**
 * Página pública de confirmação de presença.
 *
 * O metadata daqui era ESTÁTICO até 18/08/2026: todo evento se apresentava como
 * "Confirmar presença — Peltrack", então o buscador enxergava N páginas
 * idênticas e o link compartilhado não dizia de que evento se tratava.
 */

/** cache() do React: generateMetadata e a página pedem o mesmo evento, e sem
 *  isto seriam duas consultas ao banco na mesma requisição. */
const buscarEvento = cache(async (id: string) =>
  prisma.event.findUnique({
    where: { id },
    select: {
      id: true, name: true, description: true, startAt: true, endAt: true,
      venue: true, city: true, uf: true, imageUrl: true, visibility: true,
      paid: true, status: true,
      tickets: { select: { price: true }, orderBy: { price: "asc" }, take: 1 },
    },
  }),
);

/**
 * startAt é data de "relógio de parede": os dígitos digitados foram gravados
 * como se fossem UTC. Por isso lemos com getUTC* e declaramos o fuso do Brasil
 * na string ISO. Usar getHours() aqui erraria em 3 horas.
 */
const p2 = (n: number) => String(n).padStart(2, "0");

function isoComFusoBR(d: Date): string {
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}` +
    `T${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:00-03:00`;
}

function dataPorExtenso(d: Date): string {
  const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return `${d.getUTCDate()} de ${meses[d.getUTCMonth()]} de ${d.getUTCFullYear()}, ${p2(d.getUTCHours())}h${p2(d.getUTCMinutes())}`;
}

const localDoEvento = (e: { venue: string | null; city: string | null; uf: string | null }) =>
  [e.venue, e.city && e.uf ? `${e.city}/${e.uf}` : e.city].filter(Boolean).join(", ");

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const evento = await buscarEvento(id);

  if (!evento) {
    return { title: `Evento não encontrado — ${SITE_NAME}`, robots: { index: false, follow: false } };
  }

  const local = localDoEvento(evento);
  const quando = dataPorExtenso(evento.startAt);
  const titulo = `${evento.name} — ${quando}`;
  const descricao =
    evento.description?.trim() ||
    `Confirme sua presença em ${evento.name}, ${quando}${local ? `, em ${local}` : ""}. Você recebe seu convite com QR Code por e-mail.`;

  // ⚠️ PRIVACIDADE: evento RESTRITO existe para não circular. Sem este noindex,
  // um link que vazasse poderia acabar indexado pelo Google. O robots.txt não
  // resolve isso, porque restrito e público têm o mesmo formato de URL.
  const restrito = evento.visibility !== "PUBLICO";

  return {
    title: titulo,
    description: descricao.slice(0, 300),
    alternates: { canonical: `/e/${evento.id}` },
    robots: restrito
      ? { index: false, follow: false, nocache: true }
      : { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: SITE_NAME,
      title: titulo,
      description: descricao.slice(0, 300),
      url: `/e/${evento.id}`,
    },
    twitter: { card: "summary_large_image", title: titulo, description: descricao.slice(0, 300) },
  };
}

export default async function ConfirmacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const evento = await buscarEvento(id);

  // Dados estruturados só nos eventos PÚBLICOS: é o que alimenta o resultado
  // rico do Google e o que os buscadores de IA leem melhor. Em evento restrito
  // seria entregar os dados que o noindex acabou de esconder.
  const publico = evento && evento.visibility === "PUBLICO";
  const preco = evento?.tickets[0]?.price;

  const schema = publico
    ? {
        "@context": "https://schema.org",
        "@type": "Event",
        name: evento.name,
        startDate: isoComFusoBR(evento.startAt),
        ...(evento.endAt ? { endDate: isoComFusoBR(evento.endAt) } : {}),
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        ...(evento.description ? { description: evento.description } : {}),
        ...(evento.imageUrl ? { image: [evento.imageUrl] } : {}),
        ...(localDoEvento(evento)
          ? {
              location: {
                "@type": "Place",
                name: evento.venue || localDoEvento(evento),
                address: {
                  "@type": "PostalAddress",
                  addressLocality: evento.city ?? undefined,
                  addressRegion: evento.uf ?? undefined,
                  addressCountry: "BR",
                },
              },
            }
          : {}),
        offers: {
          "@type": "Offer",
          url: urlAbsoluta(`/e/${evento.id}`),
          price: evento.paid && preco ? Number(preco).toFixed(2) : "0",
          priceCurrency: "BRL",
          availability: "https://schema.org/InStock",
        },
      }
    : null;

  return (
    <>
      {schema && (
        <script
          type="application/ld+json"
          // O conteúdo vem do nosso banco, não do visitante. Ainda assim, o
          // JSON.stringify escapa aspas, e o replace fecha a única saída que
          // sobraria: uma tag </script> dentro do nome do evento.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\u003c") }}
        />
      )}
      <ConfirmationFlow eventId={id} />
    </>
  );
}
