/**
 * Token de sessão do app DESKTOP. Assinado com HMAC-SHA256 usando o AUTH_SECRET
 * que já existe — sem dependência nova e sem tabela no banco (stateless).
 *
 * ponytail: JWT completo seria overkill aqui — controlamos as duas pontas (nossa
 * API e nosso app), então um token assinado com algoritmo fixo é mais simples e
 * imune a "alg confusion". Comparação da assinatura é em tempo constante.
 */
import { createHmac, timingSafeEqual } from "crypto";

const TTL_DIAS = 30;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET não configurado.");
  return s;
}

const assinar = (dados: string) => createHmac("sha256", secret()).update(dados).digest("base64url");

export function signDesktopToken(userId: string): string {
  const corpo = Buffer.from(
    JSON.stringify({ userId, exp: Date.now() + TTL_DIAS * 86_400_000 }),
  ).toString("base64url");
  return `${corpo}.${assinar(corpo)}`;
}

export function verifyDesktopToken(token: string): { userId: string } | null {
  const [corpo, assinatura] = token.split(".");
  if (!corpo || !assinatura) return null;

  const esperada = assinar(corpo);
  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const { userId, exp } = JSON.parse(Buffer.from(corpo, "base64url").toString());
    if (typeof userId !== "string" || typeof exp !== "number" || exp < Date.now()) return null;
    return { userId };
  } catch {
    return null;
  }
}
