import type { Metadata } from "next";
import Link from "next/link";
import { Zap, Clock } from "lucide-react";
import { lerTokenReset } from "@/lib/resetPassword";
import NovaSenhaForm from "@/components/auth/NovaSenhaForm";

export const metadata: Metadata = { title: "Criar nova senha | Peltrack" };
export const dynamic = "force-dynamic";

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  // Confere ANTES de mostrar o formulário, sem consumir o token. Assim a pessoa
  // descobre que o link venceu antes de digitar a senha, não depois.
  const valido = token ? await lerTokenReset(token) : null;

  return (
    <div className="min-h-screen bg-fundo flex flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-laranja flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" fill="white" />
        </div>
        <span className="text-foreground font-bold text-xl tracking-tight">
          Pel<span className="text-laranja">track</span>
        </span>
      </Link>

      <div className="bg-card rounded-2xl border border-border p-8 sm:p-10 max-w-md w-full">
        {valido ? (
          <NovaSenhaForm token={token!} />
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-foreground font-bold text-xl mb-2">Link expirado ou inválido</h1>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Os links de recuperação valem por 30 minutos e só funcionam uma vez. Peça um novo para
              continuar.
            </p>
            <Link
              href="/recuperar-senha"
              className="inline-block w-full h-12 leading-[3rem] bg-laranja hover:bg-laranja-dark text-white font-semibold text-sm rounded-xl transition-colors"
            >
              Pedir novo link
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
