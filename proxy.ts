/**
 * Proxy (antigo "middleware") — Next.js 16 renomeou middleware.ts → proxy.ts.
 * Protege as rotas do /dashboard usando a config LEVE do Auth.js (edge-safe).
 */
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
