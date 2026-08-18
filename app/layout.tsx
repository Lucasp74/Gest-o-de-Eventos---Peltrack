import type { Metadata } from "next";
import { Fustat, Inter_Tight } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import { SITE_URL, SITE_NAME } from "@/lib/site";

// Fustat → títulos/headings · Inter Tight → corpo do texto.
// Ambas são fontes variáveis (eixo de peso), carregadas via next/font
// (auto-hospedadas, sem requisição externa em runtime).
const fustat = Fustat({
  variable: "--font-fustat",
  subsets: ["latin"],
  display: "swap",
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  display: "swap",
});

const TITULO = "Peltrack — Controle de acesso para quem leva eventos a sério";
const DESCRICAO =
  "Do convite ao QR Code, tudo em uma plataforma. Gerencie confirmações, controle a entrada e tenha relatórios em tempo real. O app de portaria funciona mesmo sem internet.";

/**
 * Metadados raiz. Tudo aqui é HERDADO pelas páginas e pode ser sobrescrito.
 *
 * metadataBase é o que permite as páginas usarem caminho relativo em imagem e
 * canônico. Sem ele o Next não monta a URL absoluta que o Open Graph exige, e
 * o cartão de compartilhamento simplesmente não aparece.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITULO,
  description: DESCRICAO,
  keywords: ["controle de acesso", "eventos", "QR Code", "presença", "SaaS"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: SITE_NAME,
    title: TITULO,
    description: DESCRICAO,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: TITULO, description: DESCRICAO },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${fustat.variable} ${interTight.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
