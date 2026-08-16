import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { lerConvite } from "@/lib/teamInvite";
import AceitarConviteForm from "@/components/auth/AceitarConviteForm";

export const metadata: Metadata = {
  title: "Convite para equipe — Peltrack",
  robots: { index: false, follow: false },
};

// O convite depende do banco a cada visita: nunca prerenderizar no build.
export const dynamic = "force-dynamic";

export default async function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const convite = await lerConvite(token);

  // Confere o token ANTES de mostrar qualquer formulário, para a pessoa não
  // preencher nome e senha à toa e só então descobrir que o link venceu.
  const org = convite
    ? await prisma.tenant.findUnique({ where: { id: convite.tenantId }, select: { name: true } })
    : null;

  const jaTemConta = convite
    ? await prisma.user.findUnique({ where: { email: convite.email }, select: { id: true } })
    : null;

  return (
    <div className="min-h-screen bg-fundo flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {!convite || !org ? (
          <Aviso
            titulo="Convite expirado ou inválido"
            texto="Este link não vale mais. Peça um convite novo para quem administra a organização."
          />
        ) : jaTemConta ? (
          <Aviso
            titulo="Você já tem conta no Peltrack"
            texto={`O e-mail ${convite.email} já está cadastrado. Nesta versão cada pessoa pertence a uma organização, então entre com sua conta ou peça o convite em outro e-mail.`}
            acao={{ href: "/login", label: "Ir para o login" }}
          />
        ) : (
          <AceitarConviteForm
            token={token}
            email={convite.email}
            papel={convite.papel}
            organizacao={org.name}
          />
        )}
      </div>
    </div>
  );
}

function Aviso({
  titulo, texto, acao,
}: {
  titulo: string;
  texto: string;
  acao?: { href: string; label: string };
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-8 text-center">
      <h1 className="text-xl font-bold text-foreground mb-2">{titulo}</h1>
      <p className="text-muted-foreground text-sm">{texto}</p>
      {acao && (
        <Link
          href={acao.href}
          className="inline-block mt-6 bg-laranja hover:bg-laranja-dark text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          {acao.label}
        </Link>
      )}
    </div>
  );
}
