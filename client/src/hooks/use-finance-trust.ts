import { useQuery } from "@tanstack/react-query";

export interface FinanceTrustSummary {
  generatedAt: string;
  obligations: { recurringMonthly: number; oneTimeUpcoming: number; cashRequiredThisPeriod: number };
  variable: {
    groceries: { method: string; target: number | null; sampleCount: number; sufficientHistory: boolean; lookbackWeeks: number; minimumSamples: number; currentActual: number; expectedToDate: number | null; remaining: number | null; variance: number | null; trend: string };
    fuel: { method: string; target: number | null; sampleCount: number; sufficientHistory: boolean; lookbackWeeks: number; minimumSamples: number; currentActual: number; expectedToDate: number | null; remaining: number | null; variance: number | null; trend: string };
    protectedReserve: number;
  };
  debtPlan: {
    targetDebt: { id: number; name: string; balance: number; apr: number | null; isCar: boolean } | null;
    safeExtraPayment: number;
    protectedAmount: number;
    blocking: string[];
    bufferProtectionPolicy: string;
    recommendationIsReadOnly: boolean;
    paymentMutationTriggered: boolean;
  };
  personalFlex: { safeSurplusBeforePersonalFlex: number; percent: number; householdBudget: number; meShare: number; spouseShare: number; currentPeriodSpending: { me: number; spouse: number }; remaining: number };
}

export function useFinanceTrustSummary() {
  return useQuery<FinanceTrustSummary>({ queryKey: ["/api/finance/trust-summary"], staleTime: 30_000 });
}
