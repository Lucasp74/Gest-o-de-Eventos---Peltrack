/**
 * Preços dos planos (R$/mês). O tenant pode ter um valor negociado
 * (monthlyPrice) que sobrepõe o padrão — essencial para Enterprise.
 */
export const PLAN_DEFAULT_PRICE: Record<string, number | null> = {
  STARTER: 0,
  PRO: 79.9,
  ENTERPRISE: 120,
};

/** Valor mensal efetivo do cliente. null = ainda não definido. */
export function effectiveMonthlyPrice(plan: string, monthlyPrice: number | null): number | null {
  if (monthlyPrice !== null) return monthlyPrice;
  return PLAN_DEFAULT_PRICE[plan] ?? null;
}

/** Limites e recursos padrão de cada plano — aplicados ao assinar/cancelar. */
export const PLAN_DEFAULTS: Record<
  string,
  { maxEventsPerMonth: number; maxGuestsPerEvent: number; flagAdvancedReports: boolean; flagDesktopSync: boolean; flagApiAccess: boolean }
> = {
  STARTER: { maxEventsPerMonth: 2, maxGuestsPerEvent: 50, flagAdvancedReports: false, flagDesktopSync: false, flagApiAccess: false },
  PRO: { maxEventsPerMonth: 0, maxGuestsPerEvent: 500, flagAdvancedReports: true, flagDesktopSync: true, flagApiAccess: false },
  ENTERPRISE: { maxEventsPerMonth: 0, maxGuestsPerEvent: 0, flagAdvancedReports: true, flagDesktopSync: true, flagApiAccess: true },
};

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Taxa de conveniência (% sobre o ingresso) cobrada do COMPRADOR, por plano
 * do dono do evento. É a receita da Peltrack sobre ingressos pagos.
 */
export const PLAN_FEE_PCT: Record<string, number> = {
  STARTER: 0.08, // 8%
  PRO: 0.05,     // 5%
  ENTERPRISE: 0.03, // 3%
};

/** Valor da taxa (R$) para um ingresso, arredondado a 2 casas. */
export function convenienceFee(plan: string, ticketPrice: number): number {
  const pct = PLAN_FEE_PCT[plan] ?? 0.08;
  return Math.round(ticketPrice * pct * 100) / 100;
}

export const feePct = (plan: string): number => PLAN_FEE_PCT[plan] ?? 0.08;

/**
 * Cálculo da cobrança de UM ingresso, considerando quem paga a taxa.
 * - passFeeToBuyer=true  → comprador paga (preço + taxa); criador recebe o preço cheio.
 * - passFeeToBuyer=false → comprador paga só o preço; criador ABSORVE a taxa (recebe preço − taxa).
 * Em ambos os casos a Peltrack fica com a taxa (feeAmount). O repasse ao criador é sempre (total − taxa).
 */
export function ticketCharge(
  plan: string,
  ticketPrice: number,
  passFeeToBuyer: boolean,
): { fee: number; buyerTotal: number; creatorNet: number } {
  const fee = convenienceFee(plan, ticketPrice);
  const buyerTotal = passFeeToBuyer ? Math.round((ticketPrice + fee) * 100) / 100 : ticketPrice;
  const creatorNet = Math.round((buyerTotal - fee) * 100) / 100;
  return { fee, buyerTotal, creatorNet };
}
