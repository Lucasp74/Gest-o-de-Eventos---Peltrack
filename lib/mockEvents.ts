/**
 * ⚠️ TEMPORÁRIO — dados fictícios para desenvolvimento.
 * Serão substituídos por consultas ao Neon (via Prisma) na Fase 1.
 */

export type EventStatus = "ativo" | "inscricoes" | "lotado" | "encerrado" | "rascunho";

export interface TicketType {
  id: string;
  name: string;
  price: number;     // em reais
  quantity: number;  // total disponível
  sold: number;      // vendidos (incrementado pelo webhook do Mercado Pago quando o Pix é pago)
  /** true = taxa repassada ao comprador; false = criador absorve a taxa. Ausente = true. */
  passFeeToBuyer?: boolean;
  /** Mínimo de ingressos por compra (padrão 1). */
  minPerOrder?: number;
  /** Máximo por compra. 0/ausente = sem limite (teto pelo estoque). */
  maxPerOrder?: number;
}

export interface EventItem {
  id: string;
  name: string;
  imageUrl?: string;   // capa do evento (Vercel Blob em prod / upload local em dev)
  date: string;        // ISO
  dateLabel: string;   // exibição
  time: string;
  local: string;
  confirmed: number;
  capacity: number;
  checkedIn: number;
  status: EventStatus;
  flow: "qrcode" | "excel";
  /** Público = aparece na vitrine /eventos; Restrito = só com o link/convite. */
  visibility?: "publico" | "restrito";
  /** Janela de inscrições (opcional). Valores datetime-local. Se ausente, fica sempre aberto até lotar. */
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  /** Tipos de ingresso (eventos pagos). Ausente/vazio = evento gratuito. */
  tickets?: TicketType[];
  paid?: boolean;
  /** Taxa de conveniência (%) cobrada do comprador em ingressos pagos. */
  feePct?: number;
}

export const STATUS_META: Record<
  EventStatus,
  { label: string; className: string; dot: string }
> = {
  ativo:       { label: "Ativo",             className: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500" },
  inscricoes:  { label: "Inscrições abertas", className: "bg-blue-100 text-blue-700 border-blue-200",   dot: "bg-blue-500" },
  lotado:      { label: "Lotado",            className: "bg-laranja/10 text-laranja border-laranja/20", dot: "bg-laranja" },
  encerrado:   { label: "Encerrado",         className: "bg-gray-100 text-gray-600 border-gray-200",    dot: "bg-gray-400" },
  rascunho:    { label: "Rascunho",          className: "bg-yellow-100 text-yellow-700 border-yellow-200", dot: "bg-yellow-500" },
};

export const MOCK_EVENTS: EventItem[] = [
  {
    id: "evt-001",
    name: "Formatura Engenharia — Turma 2024",
    date: "2026-06-12",
    dateLabel: "12 jun 2026",
    time: "19:00",
    local: "Teatro Municipal",
    confirmed: 248,
    capacity: 250,
    checkedIn: 187,
    status: "ativo",
    flow: "qrcode",
  },
  {
    id: "evt-002",
    name: "Congresso de Tecnologia 2026",
    date: "2026-06-28",
    dateLabel: "28 jun 2026",
    time: "09:00",
    local: "Centro de Convenções",
    confirmed: 412,
    capacity: 600,
    checkedIn: 0,
    status: "inscricoes",
    flow: "qrcode",
  },
  {
    id: "evt-003",
    name: "Workshop de Inovação — RH",
    date: "2026-07-05",
    dateLabel: "05 jul 2026",
    time: "14:00",
    local: "Auditório Empresa",
    confirmed: 50,
    capacity: 50,
    checkedIn: 0,
    status: "lotado",
    flow: "qrcode",
  },
  {
    id: "evt-004",
    name: "Palestra: Carreira em Dados",
    date: "2026-05-20",
    dateLabel: "20 mai 2026",
    time: "19:30",
    local: "Bloco C — Sala 201",
    confirmed: 120,
    capacity: 120,
    checkedIn: 114,
    status: "encerrado",
    flow: "excel",
  },
  {
    id: "evt-005",
    name: "Semana Acadêmica de Medicina",
    date: "2026-08-10",
    dateLabel: "10 ago 2026",
    time: "08:00",
    local: "Anfiteatro Central",
    confirmed: 0,
    capacity: 400,
    checkedIn: 0,
    status: "rascunho",
    flow: "qrcode",
  },
  {
    id: "evt-006",
    name: "Confraternização de Fim de Ano",
    date: "2025-12-15",
    dateLabel: "15 dez 2025",
    time: "20:00",
    local: "Espaço de Eventos Jardins",
    confirmed: 180,
    capacity: 200,
    checkedIn: 172,
    status: "encerrado",
    flow: "qrcode",
  },
];
