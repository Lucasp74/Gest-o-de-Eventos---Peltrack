/**
 * Seed — popula o banco Neon com dados iniciais para desenvolvimento.
 *
 * Rodar com:  npm run db:seed   (ou  npx tsx prisma/seed.ts)
 *
 * É IDEMPOTENTE: usa upsert com ids fixos, então pode rodar várias vezes
 * sem duplicar dados. Senhas são gravadas com hash (bcrypt).
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../lib/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Credenciais do seed vêm do AMBIENTE (.env, fora do git) — nunca do código.
 * Veja .env.example para os nomes das variáveis.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Seed abortado: defina ${name} no .env (veja .env.example).`);
  return value;
}

const SEED_ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? "Administrador";
const SEED_ADMIN_EMAIL = required("SEED_ADMIN_EMAIL");
const SEED_ADMIN_PASSWORD = required("SEED_ADMIN_PASSWORD");

/** SEED_DEMO=false cria apenas o admin — use assim em produção. */
const SEED_DEMO = process.env.SEED_DEMO !== "false";

async function main() {
  console.log("Iniciando seed...");

  // ── Admin (dono da plataforma) ─────────────────────────
  await prisma.admin.upsert({
    where: { email: SEED_ADMIN_EMAIL },
    update: {},
    create: {
      name: SEED_ADMIN_NAME,
      email: SEED_ADMIN_EMAIL,
      passwordHash: bcrypt.hashSync(SEED_ADMIN_PASSWORD, 10),
    },
  });
  console.log("  - Admin criado");

  if (!SEED_DEMO) {
    console.log("SEED_DEMO=false — dados de demonstracao ignorados (modo producao).");
    return;
  }

  const SEED_DEMO_EMAIL = required("SEED_DEMO_EMAIL");
  const SEED_DEMO_PASSWORD = required("SEED_DEMO_PASSWORD");

  // ── Tenant demo (cliente de teste, plano Pro) ──────────
  const tenant = await prisma.tenant.upsert({
    where: { id: "demo-tenant" },
    update: {},
    create: {
      id: "demo-tenant",
      name: "Cliente Demo",
      plan: "PRO",
      maxEventsPerMonth: 0, // ilimitado no Pro
      maxGuestsPerEvent: 500,
      flagAdvancedReports: true,
    },
  });
  console.log("  - Tenant demo criado (Cliente Demo, plano Pro)");

  // ── User (login do cliente demo) ───────────────────────
  await prisma.user.upsert({
    where: { email: SEED_DEMO_EMAIL },
    update: {},
    create: {
      name: "Usuário Demo",
      email: SEED_DEMO_EMAIL,
      passwordHash: bcrypt.hashSync(SEED_DEMO_PASSWORD, 10),
      tenantId: tenant.id,
    },
  });
  console.log("  - User demo criado");

  // ── Eventos de exemplo ─────────────────────────────────
  await prisma.event.upsert({
    where: { id: "demo-evt-1" },
    update: {},
    create: {
      id: "demo-evt-1",
      tenantId: tenant.id,
      name: "Formatura Engenharia — Turma 2024",
      description: "Cerimônia de formatura com controle de acesso por QR Code.",
      subject: "Acadêmico e científico",
      category: "Formatura",
      startAt: new Date("2026-08-12T19:00:00"),
      endAt: new Date("2026-08-12T23:00:00"),
      venue: "Teatro Municipal",
      city: "São Paulo",
      uf: "SP",
      capacity: 250,
      status: "INSCRICOES",
      flow: "QRCODE",
      paid: false,
    },
  });

  await prisma.event.upsert({
    where: { id: "demo-evt-2" },
    update: {},
    create: {
      id: "demo-evt-2",
      tenantId: tenant.id,
      name: "Show de Lançamento — Turnê 2026",
      description: "Evento pago com venda de ingressos via Pix.",
      subject: "Música",
      category: "Show",
      startAt: new Date("2026-09-20T21:00:00"),
      venue: "Arena Eventos",
      city: "São Paulo",
      uf: "SP",
      capacity: 500,
      status: "INSCRICOES",
      flow: "QRCODE",
      paid: true,
      tickets: {
        create: [
          { name: "Pista (Inteira)", price: 120, quantity: 300, sold: 0 },
          { name: "Pista (Meia)", price: 60, quantity: 100, sold: 0 },
          { name: "VIP", price: 250, quantity: 100, sold: 0 },
        ],
      },
    },
  });
  console.log("  - 2 eventos de exemplo criados (1 gratuito, 1 pago)");

  console.log("Seed concluido com sucesso.");
}

main()
  .catch((e) => {
    console.error("Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
