import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { urlAbsoluta } from "@/lib/site";

/**
 * sitemap.xml gerado pelo Next (convenção de arquivo).
 *
 * ⚠️ SÓ EVENTOS PÚBLICOS. Evento com visibilidade RESTRITO existe justamente
 * para não circular; listá-lo aqui seria entregar de bandeja ao buscador o que
 * o organizador escolheu esconder. A checagem é no banco, não na tela.
 *
 * Regenera de hora em hora: sitemap congelado no build não conheceria nenhum
 * evento criado depois do deploy, que é a maioria deles.
 */
export const revalidate = 3600;

const ESTATICAS: { caminho: string; prioridade: number; frequencia: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { caminho: "/", prioridade: 1, frequencia: "weekly" },
  { caminho: "/eventos", prioridade: 0.8, frequencia: "daily" },
  // Página de conteúdo: é a que disputa busca de quem CONTRATA, e por isso tem
  // prioridade alta apesar de mudar pouco.
  { caminho: "/controle-de-acesso-offline", prioridade: 0.9, frequencia: "monthly" },
  { caminho: "/termos", prioridade: 0.2, frequencia: "yearly" },
  { caminho: "/privacidade", prioridade: 0.2, frequencia: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paginas: MetadataRoute.Sitemap = ESTATICAS.map((p) => ({
    url: urlAbsoluta(p.caminho),
    lastModified: new Date(),
    changeFrequency: p.frequencia,
    priority: p.prioridade,
  }));

  // Se o banco estiver fora do ar, é melhor devolver o sitemap das estáticas do
  // que devolver erro: sitemap quebrado faz o buscador desistir do arquivo todo.
  try {
    const eventos = await prisma.event.findMany({
      where: { visibility: "PUBLICO" },
      select: { id: true, updatedAt: true },
      orderBy: { startAt: "desc" },
      take: 5000, // teto do protocolo é 50 mil; 5 mil já é folgado para hoje
    });

    for (const e of eventos) {
      paginas.push({
        url: urlAbsoluta(`/e/${e.id}`),
        lastModified: e.updatedAt,
        changeFrequency: "daily",
        priority: 0.7,
      });
    }
  } catch (erro) {
    console.error("[sitemap] não foi possível listar os eventos públicos:", erro);
  }

  return paginas;
}
