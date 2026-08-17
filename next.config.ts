import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança — aplicados AQUI (e não no Cloudflare) de propósito:
 * nosso DNS é "DNS only" (proxy desligado, exigência da Vercel), então regra de
 * borda no Cloudflare nunca veria estas respostas.
 */

/**
 * ETAPA 1 do CSP: REPORT-ONLY. Não bloqueia nada, só registra violação.
 *
 * A lista abaixo foi levantada lendo o código em 17/08/2026, não de memória.
 * Cada fonte tem um motivo, e tirar qualquer uma quebra algo EM SILÊNCIO:
 *
 *  · challenges.cloudflare.com  → Turnstile no login do admin (script + iframe).
 *                                 Já nos mordeu uma vez, em 05/08.
 *  · www.google.com             → iframe do mapa no formulário de criar evento.
 *  · viacep.com.br              → busca de CEP, e é fetch DO NAVEGADOR.
 *                                 Faltava na lista original de 08/08.
 *  · ws-sa1 / sockjs-sa1        → Pusher, cluster sa1 (tempo real do painel).
 *  · *.public.blob...           → imagens de evento e fotos de perfil.
 *  · lh3.googleusercontent.com  → foto de quem entra pelo Google (a primeira
 *                                 vez vem de lá, antes de subir para o Blob).
 *  · data:                      → QR do Pix em base64 e prévia de upload.
 *  · blob:                      → download do CSV (URL.createObjectURL).
 *
 * FONTES: next/font baixa e serve do nosso domínio, então NÃO precisa liberar
 * fonts.gstatic.com. Por isso font-src fica só em 'self'.
 *
 * ⚠️ LIMITE CONHECIDO: script-src leva 'unsafe-inline' porque o Next injeta
 * script inline para hidratar a página. Isso protege contra recurso externo
 * injetado, mas NÃO contra XSS inline, que é a parte mais valiosa do CSP.
 * Resolver exige nonce por requisição via proxy.ts, e fica para a etapa 3.
 *
 * 'unsafe-eval' NÃO entra: a documentação do Next diz que só o modo de
 * desenvolvimento precisa dele (o React usa eval para melhorar o stack de erro).
 * Rodando local, espere violações de eval no console; em produção, não.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://lh3.googleusercontent.com",
  "connect-src 'self' https://viacep.com.br wss://ws-sa1.pusher.com https://sockjs-sa1.pusher.com",
  "frame-src https://challenges.cloudflare.com https://www.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  // Coletor próprio: report-uri é o que os navegadores atuais ainda obedecem;
  // report-to é o sucessor e depende do cabeçalho Reporting-Endpoints abaixo.
  "report-uri /api/csp-report",
  "report-to csp-endpoint",
].join("; ");

const securityHeaders = [
  // HTTPS sempre (2 anos). A Vercel já emite, mas declarar não custa.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Ninguém pode nos embutir em iframe (anti-clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Navegador não "adivinha" content-type (anti-sniffing).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Referer completo só dentro do próprio site.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // camera=(self): o scanner (web e do app desktop) lê QR pela câmera.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  // Para onde o navegador manda as violações (usado pelo "report-to" do CSP).
  { key: "Reporting-Endpoints", value: 'csp-endpoint="/api/csp-report"' },
  // ETAPA 1: só relata. Trocar a chave por "Content-Security-Policy" na etapa 2,
  // depois de dias com o console e o coletor limpos.
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig: NextConfig = {
  poweredByHeader: false, // sem "X-Powered-By: Next.js" na cara do scanner
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
