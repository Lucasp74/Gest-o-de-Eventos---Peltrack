"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Script from "next/script";
import { ShieldCheck, Loader2, Eye, EyeOff, MailCheck, ArrowLeft } from "lucide-react";

type Step = "credentials" | "code";

export default function AdminLoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");
  const [form, setForm] = useState({ email: "", password: "", code: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ttlMin, setTtlMin] = useState(10);

  // Etapa 1 — captcha + e-mail/senha → servidor envia o código por e-mail
  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const turnstileToken =
      (document.querySelector('[name="cf-turnstile-response"]') as HTMLInputElement | null)?.value ?? "";

    const res = await fetch("/api/admin/login/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, password: form.password, turnstileToken }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (res.ok) {
      if (data.ttlMin) setTtlMin(data.ttlMin);
      setStep("code");
    } else {
      setError(data.error ?? "Não foi possível iniciar o login.");
      window.turnstile?.reset();
    }
  }

  // Etapa 2 — valida o código de 6 dígitos e cria a sessão
  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("admin-credentials", {
      email: form.email,
      code: form.code,
      redirect: false,
    });

    // Auth.js v5: falha de credenciais vem em res.error (res.ok é sempre true)
    if (res && !res.error) {
      router.push("/admin");
      router.refresh();
    } else {
      setError("Código inválido ou expirado.");
      setLoading(false);
    }
  }

  function backToCredentials() {
    setStep("credentials");
    setForm((f) => ({ ...f, code: "" }));
    setError(null);
  }

  const input =
    "w-full h-12 px-4 rounded-xl border border-white/15 bg-white/5 text-sm text-white outline-none placeholder:text-white/30 focus:ring-2 focus:ring-laranja/30 focus:border-laranja transition-all";

  return (
    <div className="min-h-screen bg-grafite flex items-center justify-center px-4">
      <Script src="https://challenges.cloudflare.com/turnstile/api.js" async defer />

      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-laranja flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-white font-bold text-xl">Painel Administrativo</h1>
          <p className="text-white/40 text-sm mt-1">Acesso restrito ao Peltrack</p>
        </div>

        {step === "credentials" ? (
          <form onSubmit={handleStart} className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 space-y-5">
            {error && (
              <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-300 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">E-mail</label>
              <input
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="admin@peltrack.com"
                className={input}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className={`${input} pr-12`}
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors p-1" aria-label={showPassword ? "Ocultar" : "Mostrar"}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Captcha (Cloudflare Turnstile) */}
            <div className="cf-turnstile" data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} data-theme="dark" />

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-laranja hover:bg-laranja-dark disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</> : "Continuar"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 space-y-5">
            <div className="flex flex-col items-center text-center">
              <div className="w-11 h-11 rounded-xl bg-laranja/15 flex items-center justify-center mb-3">
                <MailCheck className="w-5 h-5 text-laranja" />
              </div>
              <p className="text-white font-semibold text-sm">Enviamos um código para o seu e-mail</p>
              <p className="text-white/40 text-xs mt-1">
                {form.email} · válido por {ttlMin} minutos
              </p>
            </div>

            {error && (
              <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-300 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Código de 6 dígitos</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.replace(/\D/g, "") }))}
                placeholder="000000"
                className={`${input} text-center text-xl tracking-[0.5em] font-semibold`}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || form.code.length !== 6}
              className="w-full h-12 bg-laranja hover:bg-laranja-dark disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</> : "Entrar"}
            </button>

            <button
              type="button"
              onClick={backToCredentials}
              className="w-full flex items-center justify-center gap-1.5 text-white/40 hover:text-white/70 text-sm transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar e reenviar código
            </button>
          </form>
        )}

        <p className="text-center text-white/25 text-xs mt-6">
          🔒 Login em duas etapas: senha + código enviado por e-mail.
        </p>
      </div>
    </div>
  );
}
