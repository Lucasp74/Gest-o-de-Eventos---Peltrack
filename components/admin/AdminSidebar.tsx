"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ShieldCheck, LayoutDashboard, Building2, Inbox, LogOut, Menu, X } from "lucide-react";

const items = [
  { icon: LayoutDashboard, label: "Visão geral", href: "/admin" },
  { icon: Building2, label: "Clientes", href: "/admin/clientes" },
  { icon: Inbox, label: "Leads de vendas", href: "/admin/leads" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Barra superior (mobile/tablet) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-grafite h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-laranja flex items-center justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-white font-bold text-base">
            Peltrack{" "}
            <span className="text-laranja text-[10px] font-semibold uppercase tracking-wider">Admin</span>
          </span>
        </div>
        <button onClick={() => setOpen(!open)} className="text-white p-2" aria-label="Menu">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar (fixa no desktop, gaveta no mobile) */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-grafite flex flex-col transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="h-16 flex items-center gap-2 px-6 border-b border-white/8">
          <div className="w-8 h-8 rounded-lg bg-laranja flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-base leading-none">Peltrack</span>
            <span className="block text-laranja text-[10px] font-semibold uppercase tracking-wider">Admin</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {items.map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active ? "bg-laranja text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon className="w-[18px] h-[18px]" />
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="border-t border-white/8 p-3">
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-[18px] h-[18px]" /> Sair
          </button>
        </div>
      </aside>
    </>
  );
}
