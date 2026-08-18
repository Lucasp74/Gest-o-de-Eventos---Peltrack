import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

/**
 * Cartão de compartilhamento do evento (1200x630).
 *
 * POR QUE ISTO É O ITEM DE MAIOR RETORNO PRÁTICO: até 18/08/2026 o site NÃO
 * TINHA NENHUMA tag Open Graph. Todo link do Peltrack colado no WhatsApp, e é
 * por ali que o convite circula no Brasil, aparecia como texto pelado.
 *
 * ⚠️ TRÊS ARMADILHAS JÁ PAGAS AQUI, todas descobertas em 18/08/2026:
 *  1) params é PROMISE no Next 16 (mudou na v16.0.0). Tratado como objeto, o id
 *     chega indefinido, o Prisma levanta erro e a rota devolve 500.
 *  2) O Satori (motor que desenha) EXIGE display explícito em qualquer elemento
 *     com mais de um filho, e NÃO suporta z-index. Navegador perdoa, ele não.
 *  3) O WhatsApp DESCARTA EM SILÊNCIO imagem acima de ~300 KB, e guarda essa
 *     falha por cerca de 7 dias. Capa fotográfica em PNG passa disso fácil:
 *     um evento real gerou 508 KB. Daí a medição no fim deste arquivo.
 */
export const alt = "Convite do evento";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GRAFITE = "#1E2535";
const TEAL = "#1F8A7A";

/** Teto prático do WhatsApp é ~300 KB. 280 KB deixa margem. */
const LIMITE_WHATSAPP = 280_000;

/** Só aceitamos capa do NOSSO armazenamento. Sem isto, uma URL arbitrária no
 *  banco viraria uma requisição que o nosso servidor faz para onde o dado mandar. */
const capaConfiavel = (url: string | null): string | null =>
  url && /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//i.test(url) ? url : null;

const p2 = (n: number) => String(n).padStart(2, "0");
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** startAt é "relógio de parede": lê-se com getUTC*, senão erra 3 horas. */
const quandoCurto = (d: Date) =>
  `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()} · ${p2(d.getUTCHours())}h${p2(d.getUTCMinutes())}`;

function cartao(dados: { nome: string; quando: string; local: string; capa: string | null }) {
  const { nome, quando, local, capa } = dados;
  return (
    <div
      style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        justifyContent: "flex-end", padding: 72, position: "relative",
        background: capa ? GRAFITE : `linear-gradient(135deg, ${GRAFITE} 0%, #16303a 60%, ${TEAL} 160%)`,
        fontFamily: "sans-serif",
      }}
    >
      {capa && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={capa} alt=""
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.38 }}
        />
      )}

      <div style={{ position: "absolute", top: 60, left: 72, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: TEAL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: "#fff", fontWeight: 700 }}>
          P
        </div>
        {/* display explícito: dois filhos (texto + span) e o Satori exige. */}
        <div style={{ display: "flex", fontSize: 30, color: "#fff", fontWeight: 700, letterSpacing: -0.5 }}>
          Pel<span style={{ color: TEAL }}>track</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontSize: 26, color: TEAL, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase" }}>
          Confirme sua presença
        </div>
        <div style={{ fontSize: 68, color: "#fff", fontWeight: 700, lineHeight: 1.1, maxWidth: 1000 }}>
          {nome.length > 70 ? `${nome.slice(0, 70)}…` : nome}
        </div>
        <div style={{ fontSize: 30, color: "#cfd6e4", display: "flex", gap: 18 }}>
          <span>{quando}</span>
          {local && <span style={{ color: "#8e9bb3" }}>|</span>}
          {local && <span>{local.length > 46 ? `${local.slice(0, 46)}…` : local}</span>}
        </div>
      </div>
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Cartão NUNCA pode devolver erro: 500 aqui significa link sem preview nenhum.
  const evento = await prisma.event
    .findUnique({
      where: { id },
      select: { name: true, startAt: true, venue: true, city: true, uf: true, imageUrl: true },
    })
    .catch(() => null);

  const dados = {
    nome: evento?.name ?? "Evento",
    quando: evento ? quandoCurto(evento.startAt) : "",
    local: evento
      ? [evento.venue, evento.city && evento.uf ? `${evento.city}/${evento.uf}` : evento.city]
          .filter(Boolean).join(" · ")
      : "",
    capa: capaConfiavel(evento?.imageUrl ?? null),
  };

  const desenhar = async (capa: string | null) =>
    Buffer.from(await new ImageResponse(cartao({ ...dados, capa }), size).arrayBuffer());

  let png = await desenhar(dados.capa);

  // Se a capa deixou o arquivo pesado demais, refaz sem ela. Preview simples
  // aparece; preview pesado o WhatsApp descarta calado, que é bem pior.
  if (dados.capa && png.length > LIMITE_WHATSAPP) {
    png = await desenhar(null);
  }

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": contentType,
      // O cartão só muda se o evento mudar, e o Next já versiona a URL por hash.
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
