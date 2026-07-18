import type { Metadata } from "next";
import { Fustat, Inter_Tight } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

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

export const metadata: Metadata = {
  title: "Peltrack — Controle de acesso para quem leva eventos a sério",
  description:
    "Do convite ao QR Code, tudo em uma plataforma. Gerencie confirmações, controle a entrada e tenha relatórios em tempo real.",
  keywords: ["controle de acesso", "eventos", "QR Code", "presença", "SaaS"],
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
