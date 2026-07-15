/**
 * Configuração COMPLETA do Auth.js (Node) — usada nas rotas e no servidor.
 * Combina o provider Google (do auth.config) com o Credentials (e-mail/senha),
 * o adapter do Prisma e o provisionamento automático de Tenant no cadastro.
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null; // usuário só-Google ainda sem senha

        const ok = bcrypt.compareSync(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
    // Login do ADMIN (dono da plataforma) — 2ª etapa do fluxo em duas
    // etapas: valida o CÓDIGO enviado por e-mail. A senha e o captcha
    // já foram conferidos em /api/admin/login/start (o código só existe
    // depois disso), então o código É o segundo fator.
    Credentials({
      id: "admin-credentials",
      name: "Admin",
      credentials: {
        email: { label: "E-mail", type: "email" },
        code: { label: "Código", type: "text" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const code = String(credentials?.code ?? "").trim();
        if (!email || !/^\d{6}$/.test(code)) return null;

        const admin = await prisma.admin.findUnique({
          where: { email },
          include: { otps: { orderBy: { createdAt: "desc" }, take: 1 } },
        });
        const otp = admin?.otps[0];
        if (!admin || !otp) return null;

        // Expirado, já usado ou estourou as 5 tentativas → inválido
        if (otp.usedAt || otp.expiresAt < new Date() || otp.attempts >= 5) return null;

        const ok = bcrypt.compareSync(code, otp.codeHash);
        if (!ok) {
          await prisma.adminOtp.update({
            where: { id: otp.id },
            data: { attempts: { increment: 1 } },
          });
          return null;
        }

        // Código correto → marca como usado (uso único)
        await prisma.adminOtp.update({
          where: { id: otp.id },
          data: { usedAt: new Date() },
        });

        return { id: admin.id, email: admin.email, name: admin.name, role: "admin" };
      },
    }),
  ],
  events: {
    // Todo novo usuário (cadastro via Google) ganha automaticamente seu Tenant.
    async createUser({ user }) {
      const tenant = await prisma.tenant.create({
        data: { name: user.name ?? "Minha organização", plan: "STARTER" },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { tenantId: tenant.id },
      });
    },
  },
});
