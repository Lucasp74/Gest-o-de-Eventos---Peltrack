/**
 * Verificação server-side do Cloudflare Turnstile (captcha).
 * O token gerado no navegador só vale depois de confirmado aqui —
 * impossível burlar desabilitando o widget no cliente.
 */

// Chave de teste oficial da Cloudflare (sempre passa). Enquanto ela estiver
// no .env, estamos em DEV: dispensamos o captcha para não travar o login local
// caso o widget não carregue. Em produção, com a chave real, a verificação
// abaixo passa a ser SEMPRE exigida.
const CLOUDFLARE_TEST_SECRET = "1x0000000000000000000000000000000AA";

export async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || secret === CLOUDFLARE_TEST_SECRET) return true; // dev: não bloqueia

  if (!token) return false;

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: token,
    }),
  });
  if (!res.ok) return false;

  const data = (await res.json()) as { success: boolean };
  return data.success === true;
}
