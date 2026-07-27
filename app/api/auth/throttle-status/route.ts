/**
 * Status do rate limit de login (somente leitura) — usado pelo formulário de login
 * web para exibir a mensagem de "muitas tentativas". O bloqueio de fato acontece no
 * authorize (auth.ts); aqui é só para a UX (o Auth.js não repassa mensagens custom).
 */
import { NextResponse } from "next/server";
import { checkLoginThrottle, getClientIp } from "@/lib/loginThrottle";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").toLowerCase().trim();
  if (!email) return NextResponse.json({ blocked: false, retryAfterMin: 0 });
  return NextResponse.json(await checkLoginThrottle(email, getClientIp(req)));
}
