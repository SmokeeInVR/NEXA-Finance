import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTrustSummary,
  calculateSafeExtraPayment,
  categoryTarget,
  dueDateForMonth,
  periodBudgetStatus,
  finalizedDeduplicatedExpenses,
  financeObligationInputSchema,
  mealEstimateEventSchema,
  calculatePersonalFlex,
  currentPeriodPersonalSpending,
} from "../finance-trust";

describe("Finance trust foundation", () => {
  it("rejects invalid and negative obligation amounts", () => {
    assert.throws(() => financeObligationInputSchema.parse({ name: "Bad", amount: -1, dueDay: 1 }));
    assert.throws(() => financeObligationInputSchema.parse({ name: "Bad", amount: "NaN", dueDay: 1 }));
    assert.throws(() => financeObligationInputSchema.parse({ name: "Bad", amount: 10, dueDay: 0 }));
  });

  it("uses explicit end-of-month behavior for February and leap February", () => {
    assert.equal(dueDateForMonth(2026, 1, 31, true).toISOString().slice(0, 10), "2026-02-28");
    assert.equal(dueDateForMonth(2028, 1, 31, true).toISOString().slice(0, 10), "2028-02-29");
    assert.throws(() => dueDateForMonth(2026, 1, 31, false));
  });

  it("separates recurring monthly and one-time costs", () => {
    const summary = buildTrustSummary({
      obligations: [
        { name: "Rent", amount: 1000, dueDay: 5, frequency: "monthly", active: true, endOfMonth: true },
        { name: "Move-in", amount: 500, dueDay: 20, frequency: "one_time", active: true, endOfMonth: true, startDate: "2026-02-20" },
      ], transactions: [], debts: [], cashAvailable: 0, bufferFloor: 0, now: new Date("2026-02-01T00:00:00Z"),
    });
    assert.equal(summary.obligations.recurringMonthly, 1000);
    assert.equal(summary.obligations.oneTimeUpcoming, 500);
    assert.equal(summary.obligations.cashRequiredThisPeriod, 1500);
  });

  it("excludes transfers, debt payments, refunds, pending rows, and duplicate provider rows", () => {
    const result = finalizedDeduplicatedExpenses([
      { type: "spend", amount: "20", category: "Groceries", date: "2026-01-01", providerTransactionId: "a" },
      { type: "spend", amount: "20", category: "Groceries", date: "2026-01-01", providerTransactionId: "a" },
      { type: "transfer", amount: "500", category: "Groceries", date: "2026-01-01" },
      { type: "debt_payment", amount: "200", category: "Debt", date: "2026-01-01" },
      { type: "spend", amount: "4", category: "Fuel", date: "2026-01-01", pending: true },
    ]);
    assert.equal(result.length, 1);
    assert.equal(result[0].amount, "20");
  });

  it("reports insufficient history honestly and derives a finalized target when sufficient", () => {
    const insufficient = categoryTarget([], "Groceries");
    assert.equal(insufficient.target, null);
    assert.equal(insufficient.sufficientHistory, false);
    const records = Array.from({ length: 4 }, (_, index) => ({ type: "spend", amount: 14, category: "Groceries", date: `2026-07-${String(index + 1).padStart(2, "0")}` }));
    const derived = categoryTarget(records, "Groceries", { lookbackWeeks: 8 });
    assert.equal(derived.target, 7);
    assert.equal(derived.method, "mean_finalized_deduplicated");
    assert.equal(categoryTarget([], "Groceries", { override: 180 }).target, 180);
  });

  it("uses finalized personal spending only and protects remaining—not original—flex", () => {
    const spending = currentPeriodPersonalSpending([
      { type: "spend", amount: 20, category: "Personal (Me)", date: "2026-07-02", providerTransactionId: "me" },
      { type: "spend", amount: 15, category: "Personal (Spouse)", date: "2026-07-03", providerTransactionId: "spouse" },
      { type: "transfer", amount: 100, category: "Personal (Me)", date: "2026-07-04" },
      { type: "debt_payment", amount: 100, category: "Personal (Spouse)", date: "2026-07-04" },
      { type: "spend", amount: 50, category: "Personal (Me)", date: "2026-07-05", pending: true },
      { type: "spend", amount: 20, category: "Personal (Me)", date: "2026-07-02", providerTransactionId: "me" },
    ], new Date("2026-07-16T00:00:00Z"));
    const flex = calculatePersonalFlex({ safeSurplusBeforePersonalFlex: 500, personalFlexPercent: 10, meSplitPercent: 60, currentPeriodSpending: spending });
    assert.deepEqual(spending, { me: 20, spouse: 15 });
    assert.equal(flex.householdBudget, 50);
    assert.equal(flex.meShare, 30);
    assert.equal(flex.spouseShare, 20);
    assert.equal(flex.remaining, 15);
  });

  it("allocates ten percent of safe surplus to personal flex before debt payoff", () => {
    const summary = buildTrustSummary({
      obligations: [], transactions: [], debts: [{ id: 1, name: "Visa", balance: 1000, apr: 20, monthlyPayment: 30 }],
      cashAvailable: 1000, bufferFloor: 100, personalFlexPercent: 10, now: new Date("2026-07-16T00:00:00Z"),
    });
    assert.equal(summary.personalFlex.householdBudget, 90);
    assert.equal(summary.personalFlex.remaining, 90);
    assert.equal(summary.debtPlan.safeExtraPayment, 810);
    assert.equal(summary.debtPlan.paymentMutationTriggered, false);
  });

  it("protects both household allowances before calculating a safe extra payment", () => {
    const result = calculateSafeExtraPayment({
      cashAvailable: 1000,
      upcomingObligations: 0,
      variableReserves: 0,
      bufferFloor: 0,
      personalAllowance: 100,
      spouseAllowance: 200,
      debts: [{ id: 1, name: "Visa", balance: 1000, apr: 20, monthlyPayment: 30 }],
    });
    assert.equal(result.protectedAmount, 300);
    assert.equal(result.safeExtraPayment, 700);
  });

  it("protects bills, reserves, buffer, allowance; excludes cars and caps at balance", () => {
    const result = calculateSafeExtraPayment({
      cashAvailable: 1000,
      upcomingObligations: 200,
      variableReserves: 150,
      bufferFloor: 100,
      personalAllowance: 100,
      debts: [
        { id: 1, name: "Car loan", balance: 50, apr: 30, monthlyPayment: 50, isCar: true },
        { id: 2, name: "Visa", balance: 100, apr: 20, monthlyPayment: 30, isCar: false },
      ],
    });
    assert.equal(result.safeExtraPayment, 100);
    assert.equal(result.targetDebt?.name, "Visa");
    assert.equal(result.paymentMutationTriggered, false);
  });

  it("reports current-period actual, expected, remaining, and variance for variable categories", () => {
    const now = new Date("2026-07-16T00:00:00Z");
    const status = periodBudgetStatus([
      { type: "spend", amount: 14, category: "Groceries", date: "2026-07-02" },
      { type: "spend", amount: 14, category: "Groceries", date: "2026-07-10" },
      { type: "spend", amount: 14, category: "Groceries", date: "2026-07-15" },
    ], "Groceries", now, { lookbackWeeks: 8 });
    assert.equal(status.currentActual, 42);
    assert.equal(status.sufficientHistory, true);
    assert.equal(status.expectedToDate, 12);
    assert.equal(status.remaining, 0);
    assert.equal(status.trend, "over_target");
  });

  it("keeps ended, future-start, and past one-time obligations out of live cash requirements", () => {
    const summary = buildTrustSummary({
      obligations: [
        { name: "Ended", amount: 10, dueDay: 1, frequency: "monthly", active: true, endDate: "2026-06-30" },
        { name: "Future", amount: 20, dueDay: 1, frequency: "monthly", active: true, startDate: "2026-08-01" },
        { name: "Past one-time", amount: 30, dueDay: 1, frequency: "one_time", active: true, startDate: "2026-07-01" },
        { name: "Upcoming one-time", amount: 40, dueDay: 20, frequency: "one_time", active: true, startDate: "2026-07-20" },
      ], transactions: [], debts: [], cashAvailable: 0, bufferFloor: 0, personalAllowance: 0, personalAllowanceConfigured: true, now: new Date("2026-07-16T00:00:00Z"),
    });
    assert.equal(summary.obligations.oneTimeUpcoming, 40);
    assert.equal(summary.obligations.cashRequiredThisPeriod, 40);
  });

  it("blocks debt recommendation until allowance is explicitly configured", () => {
    const result = calculateSafeExtraPayment({ cashAvailable: 5000, upcomingObligations: 0, variableReserves: 0, bufferFloor: 0, personalAllowance: 0, personalAllowanceConfigured: false, debts: [{ id: 1, name: "Visa", balance: 100, monthlyPayment: 20 }] });
    assert.equal(result.safeExtraPayment, 0);
    assert.equal(result.targetDebt, null);
    assert.deepEqual(result.blocking, ["personal allowance is not configured"]);
  });
  it("validates the versioned meal estimate seam without creating a transaction", () => {
    const event = mealEstimateEventSchema.parse({ contractVersion: "1", planId: "plan-1", weekStart: "2026-07-06", weekEnd: "2026-07-12", currency: "USD", estimateAmount: 85, generatedAt: "2026-07-06T12:00:00.000Z", source: "meal-planner/v1", idempotencyKey: "plan-1:2026-07-06" });
    assert.equal(event.planId, "plan-1");
  });
});
