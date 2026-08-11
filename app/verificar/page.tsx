import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { confirmarToken } from "@/lib/verifyEmail";

export const metadata: Metadata = { title: "Confirmar e-mail | Peltrack" };
export const dynamic = "force-dynamic";

export default async function VerificarPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const r = token ? await confirmarToken(token) : { ok: false, motivo: "invalido" as const };

  const conteudo = r.ok
    ? {
        Icon: CheckCircle2,
        cor: "text-green-600",
        fundo: "bg-green-50",
        titulo: "E-mail confirmado!",
        texto: "Sua conta está ativa. Agora é só entrar e criar seu primeiro evento.",
        acao: { href: "/login", label: "Entrar na minha conta" },
      }
    : r.motivo === "expirado"
      ? {
          Icon: Clock,
          cor: "text-amber-600",
          fundo: "bg-amber-50",
          titulo: "Este link expirou",
          texto: "Os links de confirmação valem 24 horas. Tente entrar com sua conta, pois a tela de login oferece o reenvio.",
          acao: { href: "/login", label: "Ir para o login" },
        }
      : {
          Icon: XCircle,
          cor: "text-red-600",
          fundo: "bg-red-50",
          titulo: "Link inválido",
          texto: "Este link não é válido ou já foi usado. Se você já confirmou, é só entrar normalmente.",
          acao: { href: "/login", label: "Ir para o login" },
        };

  const { Icon } = conteudo;

  return (
    <div className="min-h-screen bg-fundo flex items-center justify-center px-4">
      <div className="bg-card rounded-2xl border border-border p-8 sm:p-10 max-w-md w-full text-center">
        <div className={`w-16 h-16 rounded-2xl ${conteudo.fundo} flex items-center justify-center mx-auto mb-5`}>
          <Icon className={`w-8 h-8 ${conteudo.cor}`} />
        </div>
        <h1 className="text-foreground font-bold text-xl mb-2">{conteudo.titulo}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-6">{conteudo.texto}</p>
        <Link
          href={conteudo.acao.href}
          className="inline-block w-full h-12 leading-[3rem] bg-laranja hover:bg-laranja-dark text-white font-semibold text-sm rounded-xl transition-colors"
        >
          {conteudo.acao.label}
        </Link>
      </div>
    </div>
  );
}
