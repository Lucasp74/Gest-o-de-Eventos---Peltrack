"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Zap, ArrowRight, Loader2 } from "lucide-react";
import GoogleButton from "@/components/auth/GoogleButton";

export default function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [authError, setAuthError] = useState<string | null>(null);
  // Senha certa, e-mail não confirmado → oferece reenviar o link.
  const [naoConfirmado, setNaoConfirmado] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);

  function validate() {
    const e: typeof errors = {};
    if (!form.email) e.email = "E-mail obrigatório";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "E-mail inválido";
    if (!form.password) e.password = "Senha obrigatória";
    else if (form.password.length < 6)
      e.password = "Mínimo de 6 caracteres";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setAuthError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    // Auth.js v5: falha de credenciais vem em res.error (res.ok é sempre true)
    if (res && !res.error) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    // Falhou — o Auth.js devolve erro genérico, então perguntamos o motivo real:
    // bloqueio por tentativas, e-mail não confirmado, ou credencial errada mesmo.
    let msg = "E-mail ou senha incorretos.";
    setNaoConfirmado(false);
    try {
      const r = await fetch("/api/auth/login-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await r.json();
      if (data?.blocked) {
        msg = `Muitas tentativas. Tente novamente em ${data.retryAfterMin} min.`;
      } else if (data?.unverified) {
        msg = "Confirme seu e-mail para entrar. Enviamos um link no seu cadastro.";
        setNaoConfirmado(true);
      }
    } catch {
      /* mantém a mensagem genérica */
    }
    setAuthError(msg);
    setLoading(false);
  }

  async function reenviarConfirmacao() {
    setReenviando(true);
    await fetch("/api/auth/resend-confirmation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email }),
    }).catch(() => {});
    setReenviando(false);
    setReenviado(true);
  }

  return (
    <div className="min-h-screen bg-fundo flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <a href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-laranja flex items-center justify-center shadow-lg shadow-laranja/30">
              <Zap className="w-5 h-5 text-white" fill="white" />
            </div>
            <span className="text-foreground font-bold text-2xl tracking-tight">
              Pel<span className="text-laranja">track</span>
            </span>
          </a>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-xl shadow-black/5 border border-border p-8">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-1">
              Bem-vindo de volta
            </h1>
            <p className="text-muted-foreground text-sm">
              Acesse sua conta para gerenciar seus eventos
            </p>
          </div>

          {/* Erro de autenticação */}
          {authError && (
            <div
              role="alert"
              className={`mb-5 text-sm px-4 py-3 rounded-xl border ${
                naoConfirmado
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-red-50 border-red-200 text-red-600"
              }`}
            >
              {authError}
              {naoConfirmado && (
                <button
                  type="button"
                  onClick={reenviarConfirmacao}
                  disabled={reenviando || reenviado}
                  className="block mt-2 font-semibold underline underline-offset-2 disabled:no-underline disabled:opacity-70"
                >
                  {reenviado ? "E-mail reenviado — confira sua caixa de entrada." : reenviando ? "Reenviando..." : "Reenviar e-mail de confirmação"}
                </button>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={(e) => {
                  setForm((f) => ({ ...f, email: e.target.value }));
                  if (errors.email) setErrors((er) => ({ ...er, email: undefined }));
                }}
                className={`w-full h-12 px-4 rounded-xl border text-sm text-foreground bg-card outline-none transition-all
                  placeholder:text-muted-foreground
                  focus:ring-2 focus:ring-laranja/20 focus:border-laranja
                  ${errors.email
                    ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                    : "border-border hover:border-border"
                  }`}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Senha */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground"
                >
                  Senha
                </label>
                <a
                  href="/recuperar-senha"
                  className="text-xs text-laranja hover:text-laranja-dark font-medium transition-colors"
                >
                  Esqueceu a senha?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, password: e.target.value }));
                    if (errors.password)
                      setErrors((er) => ({ ...er, password: undefined }));
                  }}
                  className={`w-full h-12 px-4 pr-12 rounded-xl border text-sm text-foreground bg-card outline-none transition-all
                    placeholder:text-muted-foreground
                    focus:ring-2 focus:ring-laranja/20 focus:border-laranja
                    ${errors.password
                      ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                      : "border-border hover:border-border"
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Lembrar */}
            <div className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                className="w-4 h-4 rounded border-border accent-laranja cursor-pointer"
              />
              <label
                htmlFor="remember"
                className="text-sm text-muted-foreground cursor-pointer select-none"
              >
                Manter conectado
              </label>
            </div>

            {/* Botão */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-laranja hover:bg-laranja-dark disabled:opacity-60 disabled:cursor-not-allowed
                text-white font-semibold rounded-xl transition-all duration-200
                shadow-lg shadow-laranja/25 hover:shadow-laranja/35 hover:-translate-y-0.5
                flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-muted" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="flex-1 h-px bg-muted" />
          </div>

          {/* Login com Google */}
          <GoogleButton label="Entrar com Google" />

          {/* Criar conta */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Ainda não tem conta?{" "}
            <a
              href="/cadastro"
              className="text-laranja hover:text-laranja-dark font-semibold transition-colors"
            >
              Criar conta grátis
            </a>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2026 Peltrack ·
          <a href="/privacidade" className="hover:text-muted-foreground transition-colors ml-1">
            Privacidade
          </a>
          {" "}·{" "}
          <a href="/termos" className="hover:text-muted-foreground transition-colors">
            Termos
          </a>
        </p>
      </div>
    </div>
  );
}
