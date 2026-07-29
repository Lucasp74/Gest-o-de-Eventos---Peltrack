/**
 * Configuração base do Auth.js — parte LEVE (edge-safe), usada pelo middleware.
 * Não importa Prisma nem bcrypt (que são só de Node). O provider Google e os
 * callbacks ficam aqui; o Credentials e o adapter ficam no auth.ts.
 */

import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { NextResponse } from "next/server";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // permite vincular o login Google a uma conta existente de mesmo e-mail
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    // Protege /dashboard (cliente logado) e /admin (apenas papel admin)
    authorized({ auth, request: { nextUrl } }) {
      const role = auth?.user?.role;
      const path = nextUrl.pathname;

      // Área admin: exige papel "admin"; senão manda para o login do admin
      if (path.startsWith("/admin") && path !== "/admin/login") {
        if (role === "admin") return true;
        return NextResponse.redirect(new URL("/admin/login", nextUrl));
      }

      // Área do cliente
      if (path.startsWith("/dashboard")) return !!auth?.user;

      return true;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.uid = user.id;
        if (user.role) token.role = user.role;
        token.picture = user.image ?? null;
      }
      // useSession().update({ image }) → atualiza a foto no token sem novo login
      if (trigger === "update" && typeof (session as { image?: unknown })?.image === "string") {
        token.picture = (session as { image?: string }).image;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        if (token.uid) session.user.id = token.uid as string;
        if (token.role) session.user.role = token.role as string;
        session.user.image = (token.picture as string | null) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
