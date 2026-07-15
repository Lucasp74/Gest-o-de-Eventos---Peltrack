import { PricingSection, type Plan } from "@/components/ui/pricing";

const PLANS: Plan[] = [
  {
    name: "Starter",
    info: "Para quem está começando",
    price: { mensal: 0, anual: 0 },
    features: [
      { text: "Até 2 eventos por mês" },
      { text: "Até 50 convidados por evento" },
      { text: "QR Code e convite por e-mail" },
      { text: "Scanner pelo celular" },
      {
        text: "Relatório básico de presença",
        tooltip: "Total de presentes e horário de entrada",
      },
      { text: "Suporte por e-mail" },
    ],
    btn: { text: "Criar conta grátis", href: "/cadastro" },
  },
  {
    name: "Pro",
    info: "Para quem organiza com frequência",
    highlighted: true,
    price: { mensal: 79, anual: Math.round(79 * 12 * 0.8) },
    features: [
      { text: "Eventos ilimitados" },
      { text: "Até 500 convidados por evento" },
      {
        text: "Lista de espera automática",
        tooltip: "Cancelamentos liberam vagas e notificam o próximo da fila",
      },
      {
        text: "Múltiplos terminais simultâneos",
        tooltip: "Vários guichês de check-in sincronizados em tempo real",
      },
      { text: "Relatórios completos e exportação" },
      { text: "Suporte prioritário", tooltip: "Atendimento com prioridade na fila" },
    ],
    btn: { text: "Começar agora", href: "/cadastro" },
  },
  {
    name: "Enterprise",
    info: "Para instituições e grande volume",
    customPrice: "Sob consulta",
    features: [
      { text: "Volume de convidados customizado" },
      { text: "Integração via API" },
      {
        text: "App Desktop com sync em tempo real",
        tooltip: "Sincronização ao vivo entre o app offline e a plataforma",
      },
      { text: "Suporte dedicado com SLA" },
      { text: "Onboarding personalizado" },
      { text: "Relatórios avançados" },
    ],
    btn: { text: "Falar com vendas", href: "mailto:contato@peltrack.com.br?subject=Interesse no plano Enterprise (Peltrack)" },
  },
];

export default function Pricing() {
  return (
    <section id="planos" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PricingSection
          plans={PLANS}
          heading="Planos simples, sem surpresas"
          description="Comece grátis e faça upgrade quando precisar. Sem contrato, cancele quando quiser."
        />
      </div>
    </section>
  );
}
