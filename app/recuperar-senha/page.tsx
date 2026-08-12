"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap, Loader2, MailCheck, ArrowLeft } from "lucide-react";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErro("Informe um e-mail válido.");
      return;
    }
    setErro(null);
    setEnviando(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => {});
    setEnviando(false);
    setEnviado(true);
  }

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
        {enviado ? (
          /* Mensagem NEUTRA de propósito: não confirma nem nega que a conta
             existe, senão a página vira forma de descobrir quem é cliente. */
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-laranja/10 flex items-center justify-center mx-auto mb-5">
              <MailCheck className="w-8 h-8 text-laranja" />
            </div>
            <h1 className="text-foreground font-bold text-xl mb-2">Verifique seu e-mail</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Se <span className="font-semibold text-foreground">{email}</span> estiver cadastrado,
              enviamos um link para você criar uma senha nova. Ele vale por 30 minutos.
            </p>
            <p className="text-muted-foreground text-xs mt-3">Não chegou? Confira a pasta de spam.</p>
            <Link
              href="/login"
              className="inline-block w-full h-11 leading-[2.75rem] mt-6 border border-border hover:border-laranja text-foreground text-sm font-medium rounded-xl transition-colors"
            >
              Voltar para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={enviar}>
            <h1 className="text-foreground font-bold text-xl mb-1">Esqueceu a senha?</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Informe o e-mail da sua conta e enviaremos um link para criar uma nova.
            </p>

            {erro && (
              <div role="alert" className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                {erro}
              </div>
            )}

            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@empresa.com.br"
              autoComplete="username"
              className="w-full h-12 px-4 rounded-xl border border-border bg-fundo text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-laranja/20 focus:border-laranja transition"
            />

            <button
              type="submit"
              disabled={enviando}
              className="w-full h-12 mt-5 bg-laranja hover:bg-laranja-dark disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
              {enviando ? "Enviando..." : "Enviar link de recuperação"}
            </button>

            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 mt-4 text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar para o login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
