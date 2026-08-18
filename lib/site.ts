/**
 * Endereço canônico do site, usado por metadados, Open Graph, sitemap e robots.
 *
 * É www.peltrack.com de propósito: o domínio sem www responde 308 redirecionando
 * para o com www (conferido em produção). Apontar o canônico para o endereço que
 * redireciona faria buscador e IA seguirem um salto a mais sem necessidade.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.peltrack.com"
).replace(/\/$/, "");

export const SITE_NAME = "Peltrack";

/** URL absoluta a partir de um caminho ("/eventos" → "https://.../eventos"). */
export const urlAbsoluta = (caminho: string) =>
  `${SITE_URL}${caminho.startsWith("/") ? caminho : `/${caminho}`}`;
