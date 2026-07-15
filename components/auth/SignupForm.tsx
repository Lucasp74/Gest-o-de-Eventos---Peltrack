"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Zap, ArrowRight, Loader2 } from "lucide-react";
import GoogleButton from "@/components/auth/GoogleButton";

export default function SignupForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [authError, setAuthError] = useState<string | null>(null);

  function validate() {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "Nome obrigatório";
    if (!form.email) e.email = "E-mail obrigatório";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "E-mail inválido";
    if (!form.password) e.password = "Senha obrigatória";
    else if (form.password.length < 6) e.password = "Mínimo de 6 caracteres";
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

    // 1) Cria a conta no banco
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setAuthError(data.error ?? "Não foi possível criar a conta.");
      setLoading(false);
      return;
    }

    // 2) Loga automaticamente
    const login = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    if (login?.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      // conta criada, mas falhou o auto-login — manda para o login
      router.push("/login");
    }
  }

  const inputBase =
    "w-full h-12 px-4 rounded-xl border text-sm text-grafite bg-white outline-none transition-all placeholder:text-gray-400 focus:ring-2 focus:ring-laranja/20 focus:border-laranja";

  function cls(err?: string) {
    return `${inputBase} ${err ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-gray-200 hover:border-gray-300"}`;
  }

  return (
    <div className="min-h-screen bg-fundo flex items-center justify-center px-4 py-10">
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

        <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-gray-100 p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-grafite mb-1">Criar sua conta</h1>
            <p className="text-grafite-muted text-sm">Comece grátis a gerenciar seus eventos</p>
          </div>

          {authError && (
            <div role="alert" className="mb-5 flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-grafite mb-1.5">Nome</label>
              <input
                id="name"
                autoComplete="name"
                placeholder="Seu nome"
                value={form.name}
                onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); if (errors.name) setErrors((er) => ({ ...er, name: undefined })); }}
                className={cls(errors.name)}
              />
              {errors.name && <p className="mt-1.5 text-xs text-red-500">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-grafite mb-1.5">E-mail</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); if (errors.email) setErrors((er) => ({ ...er, email: undefined })); }}
                className={cls(errors.email)}
              />
              {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-grafite mb-1.5">Senha</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Mínimo de 6 caracteres"
                  value={form.password}
                  onChange={(e) => { setForm((f) => ({ ...f, password: e.target.value })); if (errors.password) setErrors((er) => ({ ...er, password: undefined })); }}
                  className={`${cls(errors.password)} pr-12`}
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-grafite transition-colors p-1" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-laranja hover:bg-laranja-dark disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-laranja/25 hover:shadow-laranja/35 hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Criando conta...</>) : (<>Criar conta <ArrowRight className="w-4 h-4" /></>)}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">ou</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <GoogleButton label="Cadastrar com Google" />

          <p className="text-center text-sm text-grafite-muted mt-6">
            Já tem conta?{" "}
            <a href="/login" className="text-laranja hover:text-laranja-dark font-semibold transition-colors">
              Entrar
            </a>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Ao criar conta, você concorda com os{" "}
          <a href="/termos" className="hover:text-gray-600 transition-colors">Termos</a> e a{" "}
          <a href="/privacidade" className="hover:text-gray-600 transition-colors">Privacidade</a>.
        </p>
      </div>
    </div>
  );
}
