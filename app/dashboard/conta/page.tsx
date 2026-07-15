import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/dashboard/Sidebar";
import AccountPasswordForm from "@/components/dashboard/AccountPasswordForm";
import { Mail, UserRound } from "lucide-react";

export const metadata: Metadata = {
  title: "Minha conta — Peltrack",
};

export default async function ContaPage() {
  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true, image: true, passwordHash: true },
      })
    : null;

  const hasPassword = !!user?.passwordHash;

  return (
    <div className="min-h-screen bg-fundo">
      <Sidebar />
      <div className="lg:pl-64 pt-14 lg:pt-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-grafite">Minha conta</h1>
            <p className="text-grafite-muted text-sm mt-1">Gerencie seus dados de acesso.</p>
          </div>

          {/* Dados */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-laranja flex items-center justify-center overflow-hidden flex-shrink-0">
                {user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserRound className="w-7 h-7 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-grafite font-semibold text-lg">{user?.name ?? "—"}</p>
                <p className="text-grafite-muted text-sm flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {user?.email ?? "—"}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm">
              <span className="text-grafite-muted">Métodos de login:</span>
              <span className="text-xs font-medium bg-fundo border border-gray-100 px-2.5 py-1 rounded-full text-grafite">Google</span>
              {hasPassword && (
                <span className="text-xs font-medium bg-fundo border border-gray-100 px-2.5 py-1 rounded-full text-grafite">E-mail e senha</span>
              )}
            </div>
          </div>

          {/* Senha */}
          <AccountPasswordForm hasPassword={hasPassword} />
        </div>
      </div>
    </div>
  );
}
