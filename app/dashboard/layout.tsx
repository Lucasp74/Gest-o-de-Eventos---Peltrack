/**
 * Guarda visual da área do cliente.
 * O bloqueio de dados já acontece em getCurrentTenantId (lib/tenant.ts), então
 * um suspenso não leria nada mesmo. O que falta é EXPLICAR: sem esta tela ele
 * veria o painel montado e vazio, sem entender o motivo.
 *
 * Precisa existir aqui, e não só no login, porque quem entra pelo Google não
 * passa pelo authorize e quem já estava logado carrega um JWT que não expirou.
 */
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Ban } from "lucide-react";
import { PapelProvider } from "@/components/dashboard/PapelProvider";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = session?.user?.id;

  // A mesma consulta serve às duas coisas: barrar suspenso e distribuir o papel
  // para as telas. Ler o papel daqui, e não do token da sessão, faz uma troca de
  // papel valer na navegação seguinte, sem exigir novo login.
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { tenantRole: true, tenant: { select: { suspendedAt: true } } },
      })
    : null;

  if (!user?.tenant?.suspendedAt) {
    return <PapelProvider papel={user?.tenantRole ?? "DONO"}>{children}</PapelProvider>;
  }

  const desde = user.tenant.suspendedAt.toLocaleDateString("pt-BR");

  return (
    <div className="min-h-screen bg-fundo flex items-center justify-center px-4">
      <div className="bg-card rounded-2xl border border-border max-w-md w-full p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <Ban className="w-7 h-7 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">Acesso suspenso</h1>
        <p className="text-muted-foreground text-sm">
          O acesso da sua organização está suspenso desde {desde}. Seus dados continuam guardados
          e nada foi apagado.
        </p>
        <p className="text-muted-foreground text-sm mt-3">
          Para reativar, fale com a gente pelo{" "}
          <a href="mailto:contato@peltrack.com" className="font-medium text-laranja hover:underline">
            contato@peltrack.com
          </a>
          .
        </p>
        {/* As páginas públicas seguem no ar: quem já tem convite não é punido. */}
        <p className="text-muted-foreground text-xs mt-6 pt-6 border-t border-border">
          As páginas públicas dos seus eventos continuam funcionando normalmente para os convidados.
        </p>
      </div>
    </div>
  );
}
