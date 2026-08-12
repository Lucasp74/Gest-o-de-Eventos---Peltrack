/**
 * Anti-brute-force em DUAS camadas, na mesma tabela LoginThrottle:
 *
 *  1) PAR (e-mail + IP): 5 falhas → 10 min. Protege UMA conta de um atacante.
 *  2) IP sozinho: 20 falhas → 10 min, somando TODOS os e-mails. Fecha o buraco
 *     de "password spraying": com uma lista de e-mails, o atacante fazia 5
 *     tentativas em cada um e nunca bloqueava — por conta, parecia pouco; pelo
 *     IP, são centenas.
 *
 * E o CADASTRO (/api/register) ganha o próprio limite: 5 contas/hora por IP —
 * bot criando conta em massa dispara e-mail de confirmação em massa, o que
 * queimaria a reputação do domínio novo.
 *
 * As chaves são hashes com namespace ("email|ip", "ip|...", "reg|...") — não
 * guardamos dado pessoal (LGPD). Tudo FAIL-OPEN: se o banco falhar, NÃO
 * bloqueia — um rate limiter nunca deve derrubar o login por conta própria.
 * Usado no login web, desktop, admin e no cadastro.
 */
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

// Par (e-mail + IP)
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 10;
const WINDOW_MINUTES = 10;

// IP sozinho (todos os e-mails somados)
const MAX_IP_ATTEMPTS = 20;

// Cadastro por IP
const MAX_REGISTERS = 5;
const REGISTER_WINDOW_MIN = 60;

// Recuperação de senha por IP (contador próprio, separado do cadastro, para um
// fluxo não consumir a cota do outro)
const MAX_RESETS = 5;
const RESET_WINDOW_MIN = 60;

const hash = (dados: string) => createHash("sha256").update(dados).digest("hex");
const keyPar = (email: string, ip: string) => hash(`${email.toLowerCase().trim()}|${ip}`);
const keyIp = (ip: string) => hash(`ip|${ip}`);
const keyReg = (ip: string) => hash(`reg|${ip}`);
const keyReset = (ip: string) => hash(`pwd|${ip}`);

/** IP do cliente a partir dos headers (na Vercel vem no x-forwarded-for). */
export function getClientIp(req: Request | undefined | null): string {
  const xff = req?.headers?.get?.("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req?.headers?.get?.("x-real-ip")?.trim() || "desconhecido";
}

export type ThrottleState = { blocked: boolean; retryAfterMin: number };

const LIVRE: ThrottleState = { blocked: false, retryAfterMin: 0 };

/** Bloqueado se a chave tem lockedUntil no futuro. */
async function estaBloqueada(key: string): Promise<ThrottleState> {
  const row = await prisma.loginThrottle.findUnique({ where: { key } });
  if (row?.lockedUntil && row.lockedUntil > new Date()) {
    return { blocked: true, retryAfterMin: Math.ceil((row.lockedUntil.getTime() - Date.now()) / 60000) };
  }
  return LIVRE;
}

/**
 * Soma 1 tentativa na chave; ao atingir `max`, tranca por `lockMin`.
 * Contador recomeça se o bloqueio venceu ou se ficou ocioso além de `windowMin`.
 */
async function registrar(key: string, max: number, lockMin: number, windowMin: number): Promise<void> {
  const now = new Date();
  const row = await prisma.loginThrottle.findUnique({ where: { key } });
  const expirou =
    !row ||
    (row.lockedUntil ? row.lockedUntil <= now : now.getTime() - row.updatedAt.getTime() > windowMin * 60000);
  const attempts = (expirou ? 0 : row!.attempts) + 1;
  const lockedUntil = attempts >= max ? new Date(now.getTime() + lockMin * 60000) : null;

  await prisma.loginThrottle.upsert({
    where: { key },
    create: { key, attempts, lockedUntil },
    update: { attempts, lockedUntil },
  });
}

/** Chamar ANTES de conferir a senha. Barra pelo par OU pelo IP — o que travar primeiro. */
export async function checkLoginThrottle(email: string, ip: string): Promise<ThrottleState> {
  try {
    const par = await estaBloqueada(keyPar(email, ip));
    if (par.blocked) return par;
    return await estaBloqueada(keyIp(ip));
  } catch (e) {
    console.error("[loginThrottle] check falhou — liberando (fail-open):", e);
    return LIVRE;
  }
}

/** Registra uma falha de login nas duas camadas (par e IP). */
export async function recordLoginFailure(email: string, ip: string): Promise<void> {
  try {
    await registrar(keyPar(email, ip), MAX_ATTEMPTS, LOCK_MINUTES, WINDOW_MINUTES);
    await registrar(keyIp(ip), MAX_IP_ATTEMPTS, LOCK_MINUTES, WINDOW_MINUTES);
  } catch (e) {
    console.error("[loginThrottle] record falhou:", e);
  }
}

/**
 * Zera SÓ o par (e-mail, IP) após login bem-sucedido. O contador do IP fica de
 * propósito: um acerto no meio do spraying não absolve as falhas nas outras contas.
 */
export async function resetLoginThrottle(email: string, ip: string): Promise<void> {
  try {
    await prisma.loginThrottle.deleteMany({ where: { key: keyPar(email, ip) } });
  } catch (e) {
    console.error("[loginThrottle] reset falhou:", e);
  }
}

/** Cadastro: mais de 5 contas na última hora, mesmo IP → barra. */
export async function checkRegisterThrottle(ip: string): Promise<ThrottleState> {
  try {
    return await estaBloqueada(keyReg(ip));
  } catch (e) {
    console.error("[registerThrottle] check falhou — liberando (fail-open):", e);
    return LIVRE;
  }
}

/** Conta um cadastro EFETIVADO (não conta tentativa inválida). */
export async function recordRegister(ip: string): Promise<void> {
  try {
    await registrar(keyReg(ip), MAX_REGISTERS, REGISTER_WINDOW_MIN, REGISTER_WINDOW_MIN);
  } catch (e) {
    console.error("[registerThrottle] record falhou:", e);
  }
}

/** Recuperação de senha: mais de 5 pedidos na última hora, mesmo IP, barra. */
export async function checkResetThrottle(ip: string): Promise<ThrottleState> {
  try {
    return await estaBloqueada(keyReset(ip));
  } catch (e) {
    console.error("[resetThrottle] check falhou — liberando (fail-open):", e);
    return LIVRE;
  }
}

/** Conta um pedido de recuperação que REALMENTE disparou e-mail. */
export async function recordReset(ip: string): Promise<void> {
  try {
    await registrar(keyReset(ip), MAX_RESETS, RESET_WINDOW_MIN, RESET_WINDOW_MIN);
  } catch (e) {
    console.error("[resetThrottle] record falhou:", e);
  }
}
