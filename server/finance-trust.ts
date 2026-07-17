import { z } from "zod";

export const financeObligationInputSchema = z.object({
  name: z.string().trim().min(1),
  amount: z.coerce.number().finite().positive(),
  currency: z.string().trim().length(3).default("USD"),
  frequency: z.enum(["monthly", "weekly", "annual", "one_time"]).default("monthly"),
  dueDay: z.coerce.number().int().min(1).max(31),
  endOfMonth: z.boolean().default(true),
  active: z.boolean().default(true),
  startDate: z.string().date().optional().nullable(),
  endDate: z.string().date().optional().nullable(),
  category: z.string().trim().min(1).default("Other"),
  isVariable: z.boolean().default(false),
  importance: z.enum(["critical", "important", "optional"]).default("important"),
  autopay: z.boolean().default(false),
  sourceAccount: z.string().trim().optional().nullable(),
  merchantPattern: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export type FinanceObligationInput = z.infer<typeof financeObligationInputSchema>;

export const mealEstimateEventSchema = z.object({
  contractVersion: z.literal("1"),
  planId: z.string().trim().min(1),
  weekStart: z.string().date(),
  weekEnd: z.string().date(),
  currency: z.string().trim().length(3),
  estimateAmount: z.coerce.number().finite().nonnegative(),
  generatedAt: z.string().datetime(),
  source: z.string().trim().min(1),
  idempotencyKey: z.string().trim().min(1),
});

export function dueDateForMonth(year: number, monthIndex: number, dueDay: number, endOfMonth = true): Date {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const day = endOfMonth ? Math.min(dueDay, lastDay) : dueDay;
  if (day > lastDay) throw new Error(`Due day ${dueDay} is invalid for ${year}-${String(monthIndex + 1).padStart(2, "0")}`);
  return new Date(Date.UTC(year, monthIndex, day));
}

export function normalizeCompatibilityObligation(item: any) {
  const parsed = financeObligationInputSchema.parse({
    name: item.name,
    amount: item.amount,
    currency: item.currency || "USD",
    frequency: item.frequency || "monthly",
    dueDay: item.dueDay,
    endOfMonth: item.endOfMonth ?? true,
    active: item.active ?? true,
    startDate: item.startDate ?? null,
    endDate: item.endDate ?? null,
    category: item.category || "Other",
    isVariable: item.isVariable ?? false,
    importance: item.importance || "important",
    autopay: item.autopay ?? false,
    sourceAccount: item.sourceAccount ?? null,
    merchantPattern: item.merchantPattern ?? null,
    notes: item.notes ?? null,
  });
  return { ...parsed, id: item.id, source: "bill_schedule_compat", paymentStatus: "unmatched_planned" as const };
}

export function finalizedDeduplicatedExpenses(transactions: any[]) {
  const seen = new Set<string>();
  return transactions.filter((tx) => {
    const type = String(tx.type || "").toLowerCase();
    if (tx.pending === true || tx.status === "pending") return false;
    if (!["spend", "expense"].includes(type)) return false;
    if (["transfer", "debt_payment", "bill_payment", "refund", "adjustment"].includes(type)) return false;
    const providerId = tx.providerTransactionId || tx.transactionId || tx.plaidTransactionId;
    if (providerId) {
      if (seen.has(String(providerId))) return false;
      seen.add(String(providerId));
    }
    return Number.isFinite(Number(tx.amount)) && Number(tx.amount) > 0;
  });
}

export function categoryTarget(records: any[], category: string, options: { lookbackWeeks?: number; minimumSamples?: number; override?: number | null; now?: Date } = {}) {
  const lookbackWeeks = options.lookbackWeeks ?? 8;
  const minimumSamples = options.minimumSamples ?? 3;
  if (options.override != null && Number.isFinite(options.override) && options.override >= 0) {
    return { method: "override", target: options.override, sampleCount: records.length, sufficientHistory: true, lookbackWeeks, minimumSamples, asOf: (options.now || new Date()).toISOString() };
  }
  const now = options.now || new Date();
  const cutoff = now.getTime() - lookbackWeeks * 7 * 24 * 60 * 60 * 1000;
  const values = finalizedDeduplicatedExpenses(records)
    .filter((tx) => String(tx.category || "").toLowerCase() === category.toLowerCase() || (category === "Gas / Fuel" && /gas|fuel/i.test(String(tx.category || ""))))
    .filter((tx) => new Date(tx.date).getTime() >= cutoff && new Date(tx.date).getTime() <= now.getTime())
    .map((tx) => Number(tx.amount));
  if (values.length < minimumSamples) return { method: "insufficient_history", target: null, sampleCount: values.length, sufficientHistory: false, lookbackWeeks, minimumSamples, asOf: now.toISOString() };
  const weekly = values.reduce((sum, value) => sum + value, 0) / lookbackWeeks;
  return { method: "mean_finalized_deduplicated", target: Math.round(weekly * 100) / 100, sampleCount: values.length, sufficientHistory: true, lookbackWeeks, minimumSamples, asOf: now.toISOString() };
}

export function periodBudgetStatus(records: any[], category: string, now: Date, options: { target?: number | null; lookbackWeeks?: number; override?: number | null } = {}) {
  const policy = categoryTarget(records, category, { lookbackWeeks: options.lookbackWeeks, override: options.override, now });
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const elapsedDays = Math.max(1, Math.min(daysInMonth, now.getUTCDate()));
  const weeklyTarget = options.target ?? policy.target;
  const periodTarget = weeklyTarget == null ? null : Math.round((weeklyTarget * daysInMonth / 7) * 100) / 100;
  const expectedToDate = periodTarget == null ? null : Math.round(periodTarget * elapsedDays / daysInMonth * 100) / 100;
  const actualToDate = finalizedDeduplicatedExpenses(records)
    .filter((tx) => String(tx.category || "").toLowerCase() === category.toLowerCase() || (category === "Gas / Fuel" && /gas|fuel/i.test(String(tx.category || ""))))
    .filter((tx) => new Date(tx.date).getTime() >= monthStart.getTime() && new Date(tx.date).getTime() <= now.getTime())
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  const remaining = periodTarget == null ? null : Math.max(0, Math.round((periodTarget - actualToDate) * 100) / 100);
  const variance = expectedToDate == null ? null : Math.round((actualToDate - expectedToDate) * 100) / 100;
  return { ...policy, currentActual: Math.round(actualToDate * 100) / 100, expectedToDate, remaining, variance, trend: variance == null ? "setup_required" : variance > 0 ? "over_target" : "on_or_under_target", periodStart: monthStart.toISOString().slice(0, 10), periodEnd: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), daysInMonth)).toISOString().slice(0, 10) };
}

function obligationAppliesNow(obligation: any, now: Date) {
  if (obligation.active === false) return false;
  const start = obligation.startDate ? new Date(`${obligation.startDate}T00:00:00Z`) : null;
  const end = obligation.endDate ? new Date(`${obligation.endDate}T23:59:59Z`) : null;
  if (obligation.frequency === "one_time") {
    const date = start || end;
    return !!date && date >= now;
  }
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

export function calculateSafeExtraPayment(input: {
  cashAvailable: number;
  upcomingObligations: number;
  variableReserves: number;
  bufferFloor: number;
  personalAllowance: number;
  spouseAllowance?: number;
  personalFlexRemaining?: number;
  personalAllowanceConfigured?: boolean;
  debts: Array<{ id: number; name: string; balance: number; apr?: number | null; monthlyPayment: number; isCar?: boolean; excludeFromExtraPaydown?: boolean }>;
  strategy?: "avalanche" | "snowball";
}) {
  const allowanceConfigured = input.personalAllowanceConfigured !== false;
  const protectedAmount = Math.max(0, input.upcomingObligations) + Math.max(0, input.variableReserves) + Math.max(0, input.bufferFloor) + Math.max(0, input.personalAllowance) + Math.max(0, input.spouseAllowance || 0) + Math.max(0, input.personalFlexRemaining || 0);
  const available = Math.max(0, input.cashAvailable - protectedAmount);
  const targets = input.debts.filter((debt) => !debt.excludeFromExtraPaydown && !debt.isCar && !/car|auto|vehicle/i.test(debt.name) && debt.balance > 0);
  const strategy = input.strategy || "avalanche";
  targets.sort((a, b) => strategy === "snowball" ? a.balance - b.balance : (b.apr || 0) - (a.apr || 0));
  const target = allowanceConfigured ? (targets[0] || null) : null;
  const safeExtra = allowanceConfigured && target ? Math.min(available, target.balance) : 0;
  return { strategy, targetDebt: target, safeExtraPayment: Math.round(safeExtra * 100) / 100, protectedAmount: Math.round(protectedAmount * 100) / 100, blocking: [
    ...(!allowanceConfigured ? ["personal allowance is not configured"] : []),
    ...(allowanceConfigured && available <= 0 ? ["upcoming obligations, variable reserves, buffer floor, or personal allowance"] : []),
  ], bufferProtectionPolicy: "full buffer goal reserved", recommendationIsReadOnly: true, paymentMutationTriggered: false };
}

export function currentPeriodPersonalSpending(records: any[], now: Date) {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).getTime();
  const totals = { me: 0, spouse: 0 };
  for (const transaction of finalizedDeduplicatedExpenses(records)) {
    const date = new Date(transaction.date).getTime();
    if (date < monthStart || date > now.getTime()) continue;
    const category = String(transaction.category || "").trim().toLowerCase();
    if (category === "personal (me)") totals.me += Number(transaction.amount);
    if (category === "personal (spouse)") totals.spouse += Number(transaction.amount);
  }
  return { me: Math.round(totals.me * 100) / 100, spouse: Math.round(totals.spouse * 100) / 100 };
}

export function calculatePersonalFlex(input: { safeSurplusBeforePersonalFlex: number; personalFlexPercent?: number; meSplitPercent?: number; currentPeriodSpending: { me: number; spouse: number } }) {
  const safeSurplusBeforePersonalFlex = Math.max(0, input.safeSurplusBeforePersonalFlex);
  const percent = Math.min(100, Math.max(0, input.personalFlexPercent ?? 10));
  const meSplitPercent = Math.min(100, Math.max(0, input.meSplitPercent ?? 50));
  const householdBudget = Math.round(safeSurplusBeforePersonalFlex * percent) / 100;
  const meShare = Math.round(householdBudget * meSplitPercent) / 100;
  const spouseShare = Math.round((householdBudget - meShare) * 100) / 100;
  const spent = Math.max(0, input.currentPeriodSpending.me) + Math.max(0, input.currentPeriodSpending.spouse);
  const remaining = Math.max(0, Math.round((householdBudget - spent) * 100) / 100);
  return { percent, householdBudget, meShare, spouseShare, currentPeriodSpending: input.currentPeriodSpending, remaining };
}

export function buildTrustSummary(input: {
  obligations: any[];
  transactions: any[];
  debts: any[];
  cashAvailable: number;
  bufferFloor: number;
  personalAllowance?: number;
  spouseAllowance?: number;
  personalFlexPercent?: number;
  personalFlexMeSplitPercent?: number;
  groceryOverride?: number | null;
  fuelOverride?: number | null;
  now?: Date;
  personalAllowanceConfigured?: boolean;
  lookbackWeeks?: number;
}) {
  const now = input.now || new Date();
  const activeObligations = input.obligations.filter((obligation) => obligationAppliesNow(obligation, now));
  const upcoming = activeObligations.reduce((sum, obligation) => {
    if (obligation.frequency === "one_time") return sum + Number(obligation.amount);
    const due = dueDateForMonth(now.getUTCFullYear(), now.getUTCMonth(), obligation.dueDay, obligation.endOfMonth !== false);
    return due >= now ? sum + Number(obligation.amount) : sum;
  }, 0);
  const grocery = periodBudgetStatus(input.transactions, "Groceries", now, { override: input.groceryOverride, lookbackWeeks: input.lookbackWeeks });
  const fuel = periodBudgetStatus(input.transactions, "Gas / Fuel", now, { override: input.fuelOverride, lookbackWeeks: input.lookbackWeeks });
  const variableReserves = (grocery.remaining || 0) + (fuel.remaining || 0);
  const safeSurplusBeforePersonalFlex = Math.max(0, input.cashAvailable - upcoming - variableReserves - input.bufferFloor);
  const personalFlex = calculatePersonalFlex({ safeSurplusBeforePersonalFlex, personalFlexPercent: input.personalFlexPercent, meSplitPercent: input.personalFlexMeSplitPercent, currentPeriodSpending: currentPeriodPersonalSpending(input.transactions, now) });
  const debts = input.debts.map((debt) => ({
    id: debt.id,
    name: debt.name,
    balance: Number(debt.remainingBalance ?? debt.balance ?? 0),
    apr: debt.apr == null ? null : Number(debt.apr),
    monthlyPayment: Number(debt.monthlyPayment || 0),
    isCar: /car|auto|vehicle/i.test(String(debt.name)),
    excludeFromExtraPaydown: debt.excludeFromExtraPaydown === true,
  }));
  const personalAllowanceConfigured = input.personalAllowanceConfigured === true;
  return {
    generatedAt: now.toISOString(),
    obligations: { recurringMonthly: activeObligations.filter((item) => item.frequency === "monthly").reduce((sum, item) => sum + Number(item.amount), 0), oneTimeUpcoming: activeObligations.filter((item) => item.frequency === "one_time").reduce((sum, item) => sum + Number(item.amount), 0), cashRequiredThisPeriod: upcoming },
    variable: { groceries: grocery, fuel, protectedReserve: variableReserves },
    debtPlan: calculateSafeExtraPayment({ cashAvailable: input.cashAvailable, upcomingObligations: upcoming, variableReserves, bufferFloor: input.bufferFloor, personalAllowance: 0, spouseAllowance: 0, personalFlexRemaining: personalFlex.remaining, personalAllowanceConfigured: true, debts }),
    personalFlex: { safeSurplusBeforePersonalFlex, ...personalFlex },
    source: "server_canonical_trust_view",
    paymentMutationTriggered: false,
  };
}
