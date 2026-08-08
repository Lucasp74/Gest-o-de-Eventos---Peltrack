import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança — aplicados AQUI (e não no Cloudflare) de propósito:
 * nosso DNS é "DNS only" (proxy desligado, exigência da Vercel), então regra de
 * borda no Cloudflare nunca veria estas respostas. CSP fica para uma etapa
 * própria (Report-Only primeiro) — apressado, ele quebra Turnstile/Pusher/OAuth.
 */
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
];

const nextConfig: NextConfig = {
  poweredByHeader: false, // sem "X-Powered-By: Next.js" na cara do scanner
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
