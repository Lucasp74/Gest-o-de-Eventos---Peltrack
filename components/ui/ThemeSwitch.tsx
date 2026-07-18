"use client";

/**
 * Botão de alternância de tema (claro/escuro). Usa next-themes.
 * Ícone em currentColor: adapta à navbar clara e ao sidebar escuro sem props.
 */
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export default function ThemeSwitch({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  // Antes de montar, o tema real é desconhecido — reserva o espaço p/ evitar
  // mismatch de hidratação e "pulo" de layout.
  if (!mounted) {
    return <span className={`inline-block w-9 h-9 ${className}`} aria-hidden />;
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      title={isDark ? "Tema claro" : "Tema escuro"}
      className={`relative inline-flex w-9 h-9 items-center justify-center rounded-xl
        border border-current/15 hover:bg-current/10 transition-colors ${className}`}
    >
      <Sun
        className={`absolute w-[18px] h-[18px] transition-all duration-300 ${
          isDark ? "opacity-0 -rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"
        }`}
      />
      <Moon
        className={`absolute w-[18px] h-[18px] transition-all duration-300 ${
          isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-50"
        }`}
      />
    </button>
  );
}
