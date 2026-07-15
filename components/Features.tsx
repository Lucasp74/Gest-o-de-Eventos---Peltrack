import {
  QrCode, Users, ListOrdered, Smartphone,
  BarChart3, Monitor, Wifi, ShieldCheck,
} from "lucide-react";

export default function Features() {
  return (
    <section id="funcionalidades" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="max-w-xl mb-14">
          <span className="text-laranja text-sm font-semibold uppercase tracking-widest">
            Funcionalidades
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-grafite tracking-tight">
            Cada detalhe pensado para o dia do evento
          </h2>
          <p className="mt-4 text-grafite-muted text-base leading-relaxed">
            Não é só um leitor de QR Code. É uma plataforma completa de controle de acesso com gestão de convidados, capacidade e relatórios.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-auto">

          {/* Card grande — QR Code */}
          <div className="lg:col-span-2 bg-grafite rounded-2xl p-7 relative overflow-hidden group">
            <div className="relative z-10">
              <div className="w-11 h-11 rounded-xl bg-laranja flex items-center justify-center mb-5 shadow-lg shadow-laranja/30">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-white text-xl font-bold mb-2">QR Code único por convidado</h3>
              <p className="text-white/55 text-sm leading-relaxed max-w-sm">
                Cada convite tem um token UUID exclusivo. Intransferível, impossível de duplicar e vinculado ao nome do convidado — não a dados pessoais sensíveis.
              </p>
            </div>
            {/* Visual */}
            <div className="mt-6 flex items-end gap-3">
              {[
                { name: "Carlos M.", time: "19:41", ok: true },
                { name: "Ana Paula S.", time: "19:43", ok: true },
                { name: "Ricardo L.", time: "19:44", ok: false, msg: "Já registrado" },
                { name: "Fernanda O.", time: "19:45", ok: true },
              ].map((r) => (
                <div
                  key={r.name}
                  className={`flex-1 rounded-xl p-3 border text-xs ${
                    r.ok
                      ? "bg-green-500/10 border-green-500/20"
                      : "bg-yellow-500/10 border-yellow-500/20"
                  }`}
                >
                  <p className={`font-semibold mb-0.5 ${r.ok ? "text-green-400" : "text-yellow-400"}`}>
                    {r.ok ? "✓ Liberado" : "⚠ Duplicado"}
                  </p>
                  <p className="text-white/60 truncate">{r.name}</p>
                  <p className="text-white/30">{r.time}</p>
                  {r.msg && <p className="text-yellow-400/70 text-xs mt-0.5">{r.msg}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Card — Controle de vagas */}
          <div className="bg-fundo rounded-2xl p-7 border border-gray-100 group hover:border-laranja/20 hover:shadow-lg transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-white border border-gray-100 group-hover:bg-laranja/5 group-hover:border-laranja/20 flex items-center justify-center mb-5 transition-all">
              <Users className="w-5 h-5 text-laranja" />
            </div>
            <h3 className="text-grafite text-base font-bold mb-2">Controle de capacidade</h3>
            <p className="text-grafite-muted text-sm leading-relaxed mb-5">
              Defina o limite de vagas. Quando lotado, o sistema fecha inscrições automaticamente e ativa a lista de espera.
            </p>
            {/* Visual mini */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-grafite-muted">
                <span>Vagas ocupadas</span>
                <span className="font-semibold text-grafite">48 / 50</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-laranja" style={{ width: "96%" }} />
              </div>
              <p className="text-xs text-laranja font-medium">2 vagas restantes · 3 na lista de espera</p>
            </div>
          </div>

          {/* Card — Lista de espera */}
          <div className="bg-fundo rounded-2xl p-7 border border-gray-100 group hover:border-laranja/20 hover:shadow-lg transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-white border border-gray-100 group-hover:bg-laranja/5 group-hover:border-laranja/20 flex items-center justify-center mb-5 transition-all">
              <ListOrdered className="w-5 h-5 text-laranja" />
            </div>
            <h3 className="text-grafite text-base font-bold mb-2">Lista de espera automática</h3>
            <p className="text-grafite-muted text-sm leading-relaxed">
              Cancelamentos liberam vagas e notificam o próximo da fila por e-mail sem nenhuma ação manual da sua parte.
            </p>
          </div>

          {/* Card grande — Scanner */}
          <div className="lg:col-span-2 bg-fundo rounded-2xl p-7 border border-gray-100 group hover:border-laranja/20 hover:shadow-lg transition-all duration-300">
            <div className="flex gap-7 items-start">
              <div className="flex-1">
                <div className="w-11 h-11 rounded-xl bg-white border border-gray-100 group-hover:bg-laranja/5 group-hover:border-laranja/20 flex items-center justify-center mb-5 transition-all">
                  <Smartphone className="w-5 h-5 text-laranja" />
                </div>
                <h3 className="text-grafite text-base font-bold mb-2">Scanner pelo celular — sem app</h3>
                <p className="text-grafite-muted text-sm leading-relaxed">
                  Abra o painel de scanner no navegador do celular e leia QR Codes com a câmera. Sem instalar nada, funciona em qualquer dispositivo.
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {["iOS Safari", "Android Chrome", "Tablet", "Desktop + leitor USB"].map((d) => (
                    <span key={d} className="text-xs bg-white border border-gray-100 text-grafite-muted px-2.5 py-1 rounded-full">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-center gap-2 bg-white border border-gray-100 rounded-2xl p-4 min-w-[120px]">
                <div className="w-16 h-16 rounded-xl bg-grafite flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-9 h-9 text-laranja" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <rect x="3" y="3" width="8" height="8" rx="1.5" />
                    <rect x="13" y="3" width="8" height="8" rx="1.5" />
                    <rect x="3" y="13" width="8" height="8" rx="1.5" />
                    <circle cx="17" cy="17" r="2" fill="currentColor" stroke="none" />
                  </svg>
                </div>
                <p className="text-grafite text-xs font-semibold text-center">Aponte e leia</p>
                <span className="text-green-600 text-xs font-medium bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
                  &lt; 100ms
                </span>
              </div>
            </div>
          </div>

          {/* Card — Relatórios */}
          <div className="bg-fundo rounded-2xl p-7 border border-gray-100 group hover:border-laranja/20 hover:shadow-lg transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-white border border-gray-100 group-hover:bg-laranja/5 group-hover:border-laranja/20 flex items-center justify-center mb-5 transition-all">
              <BarChart3 className="w-5 h-5 text-laranja" />
            </div>
            <h3 className="text-grafite text-base font-bold mb-2">Relatórios em tempo real</h3>
            <p className="text-grafite-muted text-sm leading-relaxed mb-5">
              Acompanhe entradas por hora, por guichê e total de presentes. Exporte em Excel ao fim do evento.
            </p>
            {/* Mini bar chart */}
            <div className="flex items-end gap-1.5 h-10">
              {[30, 55, 80, 95, 70, 45, 60, 85, 100, 75, 50, 30].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-laranja/20 group-hover:bg-laranja/30 transition-colors"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <p className="text-grafite-muted text-xs mt-2">Entradas por hora — pico às 20h</p>
          </div>

          {/* Card — Offline */}
          <div className="bg-fundo rounded-2xl p-7 border border-gray-100 group hover:border-laranja/20 hover:shadow-lg transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-white border border-gray-100 group-hover:bg-laranja/5 group-hover:border-laranja/20 flex items-center justify-center mb-5 transition-all">
              <Monitor className="w-5 h-5 text-laranja" />
            </div>
            <h3 className="text-grafite text-base font-bold mb-2">App Desktop para eventos offline</h3>
            <p className="text-grafite-muted text-sm leading-relaxed">
              Para locais sem internet estável. O app desktop com leitor USB funciona offline e sincroniza quando a conexão retornar.
            </p>
          </div>

          {/* Card — Segurança */}
          <div className="bg-fundo rounded-2xl p-7 border border-gray-100 group hover:border-laranja/20 hover:shadow-lg transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-white border border-gray-100 group-hover:bg-laranja/5 group-hover:border-laranja/20 flex items-center justify-center mb-5 transition-all">
              <ShieldCheck className="w-5 h-5 text-laranja" />
            </div>
            <h3 className="text-grafite text-base font-bold mb-2">Dados isolados por cliente</h3>
            <p className="text-grafite-muted text-sm leading-relaxed">
              Cada organização opera em ambiente isolado. Seus convidados e eventos nunca são visíveis para outros clientes da plataforma.
            </p>
          </div>

          {/* Card — Multi-terminal */}
          <div className="bg-fundo rounded-2xl p-7 border border-gray-100 group hover:border-laranja/20 hover:shadow-lg transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-white border border-gray-100 group-hover:bg-laranja/5 group-hover:border-laranja/20 flex items-center justify-center mb-5 transition-all">
              <Wifi className="w-5 h-5 text-laranja" />
            </div>
            <h3 className="text-grafite text-base font-bold mb-2">Múltiplos guichês simultâneos</h3>
            <p className="text-grafite-muted text-sm leading-relaxed">
              10 guichês operando ao mesmo tempo? Sem problema. Todos sincronizados em tempo real — a mesma pessoa não entra duas vezes por portas diferentes.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
