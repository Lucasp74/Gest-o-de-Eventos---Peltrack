"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Zap, LayoutDashboard, Calendar, Users, ScanLine,
  BarChart3, Settings, Menu, X, LogOut, Monitor,
} from "lucide-react";

function getInitials(name?: string | null, email?: string | null) {
  if (name?.trim()) {
    return name.trim().split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  }
  return (email?.[0] ?? "?").toUpperCase();
}

const navItems = [
  { icon: LayoutDashboard, label: "Visão geral",   href: "/dashboard" },
  { icon: Calendar,        label: "Meus eventos",   href: "/dashboard/eventos" },
  { icon: Users,           label: "Convidados",     href: "/dashboard/convidados" },
  { icon: ScanLine,        label: "Scanner",        href: "/dashboard/scanner" },
  { icon: BarChart3,       label: "Relatórios",     href: "/dashboard/relatorios" },
  { icon: Monitor,         label: "App Desktop",    href: "/dashboard/app-desktop" },
  { icon: Settings,        label: "Configurações",  href: "/dashboard/configuracoes" },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-grafite h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-laranja flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" fill="white" />
          </div>
          <span className="text-white font-bold text-base">
            Pel<span className="text-laranja">track</span>
          </span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="text-white p-2"
          aria-label="Menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-grafite flex flex-col transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-2 px-6 border-b border-white/8">
          <div className="w-8 h-8 rounded-lg bg-laranja flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">
            Pel<span className="text-laranja">track</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <a
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                  ${active
                    ? "bg-laranja text-white shadow-lg shadow-laranja/20"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
              >
                <item.icon className="w-[18px] h-[18px]" />
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-white/8 p-3">
          <a
            href="/dashboard/conta"
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-laranja flex items-center justify-center flex-shrink-0 overflow-hidden">
              {user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xs font-bold">{getInitials(user?.name, user?.email)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name ?? "Minha conta"}</p>
              <p className="text-white/40 text-xs truncate">{user?.email ?? ""}</p>
            </div>
          </a>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 px-3 py-2.5 mt-1 w-full rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
