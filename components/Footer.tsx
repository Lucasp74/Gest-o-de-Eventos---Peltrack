"use client";

import { useState } from "react";
import { Zap, ChevronDown, ChevronUp } from "lucide-react";

const footerLinks: Record<string, { label: string; href: string }[]> = {
  Produto: [
    { label: "Funcionalidades", href: "/#funcionalidades" },
    { label: "Planos", href: "/#planos" },
    { label: "App Desktop", href: "#" },
    { label: "Atualizações", href: "#" },
  ],
  Empresa: [
    { label: "Sobre nós", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Carreiras", href: "#" },
    { label: "Contato", href: "mailto:contato@peltrack.com.br" },
  ],
  Suporte: [
    { label: "Central de ajuda", href: "#" },
    { label: "Documentação", href: "#" },
    { label: "Termos de uso", href: "/termos" },
    { label: "Privacidade", href: "/privacidade" },
  ],
};

export default function Footer() {
  // Controla quais categorias estão abertas — só afeta o mobile.
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (category: string) =>
    setOpen((o) => ({ ...o, [category]: !o[category] }));

  return (
    <footer className="bg-grafite border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <a href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-laranja flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" fill="white" />
              </div>
              <span className="text-white font-bold text-xl tracking-tight">
                Pel<span className="text-laranja">track</span>
              </span>
            </a>
            <p className="text-white/40 text-sm leading-relaxed max-w-[200px]">
              Controle de acesso para quem leva eventos a sério.
            </p>
          </div>

          {/* Links — cards em acordeão no mobile; colunas fixas no desktop (md+) */}
          {Object.entries(footerLinks).map(([category, links]) => {
            const isOpen = !!open[category];
            return (
              <div
                key={category}
                className="rounded-xl bg-white/5 px-4 py-3 md:bg-transparent md:rounded-none md:p-0"
              >
                <button
                  type="button"
                  onClick={() => toggle(category)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between text-left md:cursor-default"
                >
                  <h4 className="text-white font-semibold text-sm md:mb-4">{category}</h4>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-white/50 md:hidden" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white/50 md:hidden" />
                  )}
                </button>
                <ul
                  className={`space-y-2.5 mt-3 md:mt-0 md:block ${isOpen ? "block" : "hidden"}`}
                >
                  {links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-white/40 hover:text-white/70 text-sm transition-colors duration-200"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/30 text-sm">
            © 2026 Peltrack. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-6">
            <a href="/termos" className="text-white/30 hover:text-white/60 text-sm transition-colors">
              Termos de uso
            </a>
            <a href="/privacidade" className="text-white/30 hover:text-white/60 text-sm transition-colors">
              Política de privacidade
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
