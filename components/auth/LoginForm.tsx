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
    } else {
      setAuthError("E-mail ou senha incorretos.");
      setLoading(false);
    }
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
            <span className="text-grafite font-bold text-2xl tracking-tight">
              Pel<span className="text-laranja">track</span>
            </span>
          </a>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-gray-100 p-8">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-grafite mb-1">
              Bem-vindo de volta
            </h1>
            <p className="text-grafite-muted text-sm">
              Acesse sua conta para gerenciar seus eventos
            </p>
          </div>

          {/* Erro de autenticação */}
          {authError && (
            <div
              role="alert"
              className="mb-5 flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl"
            >
              {authError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-grafite mb-1.5"
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
                className={`w-full h-12 px-4 rounded-xl border text-sm text-grafite bg-white outline-none transition-all
                  placeholder:text-gray-400
                  focus:ring-2 focus:ring-laranja/20 focus:border-laranja
                  ${errors.email
                    ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                    : "border-gray-200 hover:border-gray-300"
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
                  className="block text-sm font-medium text-grafite"
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
                  className={`w-full h-12 px-4 pr-12 rounded-xl border text-sm text-grafite bg-white outline-none transition-all
                    placeholder:text-gray-400
                    focus:ring-2 focus:ring-laranja/20 focus:border-laranja
                    ${errors.password
                      ? "border-red-400 focus:border-red-400 focus:ring-red-100"
                      : "border-gray-200 hover:border-gray-300"
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-grafite transition-colors p-1"
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
                className="w-4 h-4 rounded border-gray-300 accent-laranja cursor-pointer"
              />
              <label
                htmlFor="remember"
                className="text-sm text-grafite-muted cursor-pointer select-none"
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
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">ou</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Login com Google */}
          <GoogleButton label="Entrar com Google" />

          {/* Criar conta */}
          <p className="text-center text-sm text-grafite-muted mt-6">
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
        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 Peltrack ·
          <a href="/privacidade" className="hover:text-gray-600 transition-colors ml-1">
            Privacidade
          </a>
          {" "}·{" "}
          <a href="/termos" className="hover:text-gray-600 transition-colors">
            Termos
          </a>
        </p>
      </div>
    </div>
  );
}
