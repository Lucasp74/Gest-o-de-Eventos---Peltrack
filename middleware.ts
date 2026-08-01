/**
 * Middleware de autenticação (Auth.js). Liga o callback `authorized` do
 * auth.config para proteger /dashboard (logado) e /admin (papel admin) numa
 * camada única, ANTES de renderizar a página.
 *
 * Usa a config LEVE (auth.config) — sem Prisma/bcrypt — porque o middleware
 * roda no Edge. A leitura da sessão é via cookie JWT (AUTH_SECRET), sem banco.
 */
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
