import type { MetadataRoute } from "next";
import { urlAbsoluta } from "@/lib/site";

/**
 * robots.txt gerado pelo Next (convenção de arquivo).
 *
 * DECISÃO DO LUCAS (17/08/2026): LIBERAR os robôs de IA, tanto os de BUSCA AO
 * VIVO (que citam a fonte na resposta, e são os que fazem o GEO existir) quanto
 * os de TREINO. São escolhas independentes, e ele quis as duas.
 *
 * ⚠️ NOME ERRADO FALHA EM SILÊNCIO. O robô só obedece se o user-agent estiver
 * escrito exatamente como ele se anuncia; "GPT-Bot" no lugar de "GPTBot" não dá
 * erro, simplesmente não vale. Por isso a lista abaixo é explícita, e não
 * confiada ao curinga.
 *
 * ⚠️ /e/ NÃO ENTRA NO DISALLOW DE PROPÓSITO. Evento restrito é escondido por
 * "noindex" na própria página, e para o robô LER esse noindex ele precisa poder
 * buscar a página. Bloquear aqui teria o efeito contrário do desejado.
 */

/** Buscam no momento de responder e CITAM a fonte. São a porta do GEO. */
const ROBOS_DE_BUSCA_IA = [
  "OAI-SearchBot",   // busca do ChatGPT
  "ChatGPT-User",    // navegação disparada pelo usuário no ChatGPT
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
];

/** Coletam para treino futuro. Liberados por escolha do Lucas. */
const ROBOS_DE_TREINO = [
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
];

/** Áreas que exigem login ou não servem para leitura. */
const PRIVADO = ["/dashboard/", "/admin/", "/api/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVADO },
      ...[...ROBOS_DE_BUSCA_IA, ...ROBOS_DE_TREINO].map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: PRIVADO,
      })),
    ],
    sitemap: urlAbsoluta("/sitemap.xml"),
    host: urlAbsoluta("/"),
  };
}
