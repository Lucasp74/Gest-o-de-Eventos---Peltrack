/**
 * Anti-brute-force do login: conta as falhas por PAR (e-mail + IP) e bloqueia
 * após 5 tentativas por 10 minutos. Só falhas do MESMO e-mail E do MESMO IP se
 * somam. A chave é um hash de "email|ip" — não guarda dado pessoal (bom p/ LGPD).
 * Usado no login web, desktop e admin.
 */
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 5; // falhas do par (e-mail+IP) antes de bloquear
const LOCK_MINUTES = 10; // duração do bloqueio
const WINDOW_MINUTES = 10; // sem novas falhas por esse tempo → o contador reseta

/** Chave anônima (hash) do par e-mail + IP. */
function makeKey(email: string, ip: string): string {
  return createHash("sha256").update(`${email.toLowerCase().trim()}|${ip}`).digest("hex");
}

/** IP do cliente a partir dos headers (na Vercel vem no x-forwarded-for). */
export function getClientIp(req: Request | undefined | null): string {
  const xff = req?.headers?.get?.("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req?.headers?.get?.("x-real-ip")?.trim() || "desconhecido";
}

export type ThrottleState = { blocked: boolean; retryAfterMin: number };

/**
 * Verifica se o par (e-mail, IP) está bloqueado. Chamar ANTES de conferir a senha.
 * FAIL-OPEN: se o store falhar (ex.: tabela ausente, DB fora), NÃO bloqueia — um
 * rate limiter nunca deve derrubar o login por conta própria.
 */
export async function checkLoginThrottle(email: string, ip: string): Promise<ThrottleState> {
  try {
    const row = await prisma.loginThrottle.findUnique({ where: { key: makeKey(email, ip) } });
    if (row?.lockedUntil && row.lockedUntil > new Date()) {
      return { blocked: true, retryAfterMin: Math.ceil((row.lockedUntil.getTime() - Date.now()) / 60000) };
    }
    return { blocked: false, retryAfterMin: 0 };
  } catch (e) {
    console.error("[loginThrottle] check falhou — liberando (fail-open):", e);
    return { blocked: false, retryAfterMin: 0 };
  }
}

/** Registra uma falha de login. Na 5ª falha do par (e-mail, IP), bloqueia por 10 min. */
export async function recordLoginFailure(email: string, ip: string): Promise<void> {
  try {
    const key = makeKey(email, ip);
    const now = new Date();
    const row = await prisma.loginThrottle.findUnique({ where: { key } });

    // Recomeça do zero se: não havia registro, o bloqueio anterior já venceu,
    // ou ficou ocioso além da janela.
    const expirou =
      !row ||
      (row.lockedUntil ? row.lockedUntil <= now : now.getTime() - row.updatedAt.getTime() > WINDOW_MINUTES * 60000);
    const attempts = (expirou ? 0 : row!.attempts) + 1;
    const lockedUntil = attempts >= MAX_ATTEMPTS ? new Date(now.getTime() + LOCK_MINUTES * 60000) : null;

    await prisma.loginThrottle.upsert({
      where: { key },
      create: { key, attempts, lockedUntil },
      update: { attempts, lockedUntil },
    });
  } catch (e) {
    console.error("[loginThrottle] record falhou:", e);
  }
}

/** Zera o contador do par (e-mail, IP) após um login bem-sucedido. */
export async function resetLoginThrottle(email: string, ip: string): Promise<void> {
  try {
    await prisma.loginThrottle.deleteMany({ where: { key: makeKey(email, ip) } });
  } catch (e) {
    console.error("[loginThrottle] reset falhou:", e);
  }
}
