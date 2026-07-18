import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { Inbox, Mail, Building2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Leads — Admin Peltrack",
  robots: { index: false, follow: false },
};

// Os leads têm de refletir o banco a cada visita — nunca prerenderizar no build.
export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="min-h-screen bg-fundo">
      <AdminSidebar />
      <div className="lg:pl-64 pt-14 lg:pt-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-foreground">Leads de vendas</h1>
          <p className="text-muted-foreground text-sm mt-1 mb-8">
            Contatos do &ldquo;Falar com vendas&rdquo; (plano Enterprise).
          </p>

          {leads.length === 0 ? (
            <div className="bg-card rounded-2xl border border-dashed border-border py-16 text-center">
              <Inbox className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-semibold">Nenhum lead ainda</p>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                Os contatos aparecem aqui quando alguém clicar em &ldquo;Falar com vendas&rdquo;.
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border divide-y divide-border">
              {leads.map((l) => (
                <div key={l.id} className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-foreground font-semibold">{l.name}</p>
                    <span className="text-xs font-medium bg-fundo border border-border px-2.5 py-0.5 rounded-full text-muted-foreground">
                      {l.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-muted-foreground text-sm">
                    <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {l.email}</span>
                    {l.company && <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> {l.company}</span>}
                  </div>
                  {l.message && <p className="text-foreground text-sm mt-2 bg-fundo/50 rounded-lg p-3">{l.message}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
