"use client";

import { useState, useEffect } from "react";
import { Menu, X, Zap } from "lucide-react";
import ThemeSwitch from "@/components/ui/ThemeSwitch";

const links = [
  { label: "Eventos", href: "/eventos" },
  { label: "Como funciona", href: "/#como-funciona" },
  { label: "Funcionalidades", href: "/#funcionalidades" },
  { label: "Planos", href: "/#planos" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-grafite/95 backdrop-blur-md shadow-lg shadow-black/20"
          : "bg-grafite"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-laranja flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" fill="white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">
              Pel<span className="text-laranja">track</span>
            </span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-white/70 hover:text-white text-sm font-medium transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeSwitch className="text-white/70 hover:text-white" />
            <a
              href="/login"
              className="text-white/70 hover:text-white text-sm font-medium transition-colors"
            >
              Entrar
            </a>
            <a
              href="/cadastro"
              className="bg-laranja hover:bg-laranja-dark text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors duration-200"
            >
              Começar grátis
            </a>
          </div>

          {/* Mobile actions */}
          <div className="md:hidden flex items-center gap-1">
            <ThemeSwitch className="text-white/70 hover:text-white" />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-grafite border-t border-white/10 px-4 pb-4">
          <nav className="flex flex-col gap-1 pt-2">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-white/70 hover:text-white py-3 text-sm font-medium transition-colors border-b border-white/5 last:border-0"
              >
                {link.label}
              </a>
            ))}
            <a
              href="/cadastro"
              className="mt-3 bg-laranja hover:bg-laranja-dark text-white text-sm font-semibold px-5 py-3 rounded-lg transition-colors text-center"
            >
              Começar grátis
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
