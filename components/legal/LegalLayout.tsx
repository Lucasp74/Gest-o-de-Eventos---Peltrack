/**
 * Layout compartilhado das páginas jurídicas (Termos e Privacidade).
 *
 * ⚠️ AVISO PARA O DONO: o conteúdo destas páginas é um TEXTO-BASE preliminar.
 * Deve ser revisado por um advogado antes do lançamento — especialmente as
 * cláusulas de responsabilidade e a conformidade com a LGPD. Os campos
 * [Razão Social] e [CNPJ] são placeholders a preencher.
 */

import Link from "next/link";
import { Zap, ArrowLeft } from "lucide-react";

export default function LegalLayout({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-fundo">
      {/* Barra da marca */}
      <header className="bg-grafite">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-laranja flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" fill="white" />
            </div>
            <span className="text-white font-bold text-base">
              Pel<span className="text-laranja">track</span>
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao site
          </Link>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm mt-2 mb-8">Última atualização: {updatedAt}</p>
        <div className="space-y-7">{children}</div>

        {/* Rodapé simples */}
        <div className="mt-12 pt-6 border-t border-border text-muted-foreground text-sm">
          <p>
            Dúvidas? Entre em contato pelo e-mail{" "}
            <a href="mailto:contato@peltrack.com.br" className="text-laranja hover:underline font-medium">
              contato@peltrack.com.br
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}

/* ── Helpers de conteúdo ─────────────────────────────── */
export function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-bold text-foreground mb-2">
        {n}. {title}
      </h2>
      <div className="space-y-2 text-muted-foreground text-sm leading-relaxed">{children}</div>
    </section>
  );
}

export function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-laranja mt-1.5 w-1 h-1 rounded-full bg-laranja flex-shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
