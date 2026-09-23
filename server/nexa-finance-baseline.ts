export type BaselineAccount = {
  type?: unknown;
  balance?: unknown;
  availableBalance?: unknown;
};

type ConnectionHealth = {
  configured: number;
  attempted: number;
  succeeded: number;
  failed: number;
};

type ManualDebt = { remainingBalance?: unknown };

const finiteAmount = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const currencyAmount = (value: number) => Math.round(value * 100) / 100;

const classify = (account: BaselineAccount) => {
  if (account.type === "depository") return "cash";
  if (account.type === "credit" || account.type === "loan") return "debt";
  if (account.type === "investment") return "investment";
  return "other";
};

/** Builds a deliberately aggregate-only view for the authenticated NEXA service. */
export function buildNexaFinanceBaseline(input: {
  fetchedAt: Date;
  connectionHealth: ConnectionHealth;
  plaidAccounts: BaselineAccount[];
  manualDebts: ManualDebt[];
}) {
  const accountCounts = { cash: 0, debt: 0, investment: 0, other: 0 };
  let cashCurrent = 0;
  let cashAvailable = 0;
  let plaidCreditLoanDebt = 0;

  for (const account of input.plaidAccounts) {
    const classification = classify(account);
    accountCounts[classification] += 1;
    if (classification === "cash") {
      cashCurrent += finiteAmount(account.balance);
      cashAvailable += finiteAmount(account.availableBalance);
    }
    if (classification === "debt") {
      plaidCreditLoanDebt += finiteAmount(account.balance);
    }
  }

  const liveFetchSucceeded = input.connectionHealth.configured > 0
    && input.connectionHealth.failed === 0
    && input.connectionHealth.succeeded === input.connectionHealth.configured;
  const unmappedUnknownAccountCount = accountCounts.other;
  const coverageUnresolved = !liveFetchSucceeded || unmappedUnknownAccountCount > 0;
  const baselineStatus = coverageUnresolved ? "incomplete" : "ready";

  return {
    sourceFetchedAt: input.fetchedAt.toISOString(),
    connectionHealth: {
      configured: input.connectionHealth.configured,
      attempted: input.connectionHealth.attempted,
      succeeded: input.connectionHealth.succeeded,
      failed: input.connectionHealth.failed,
      liveFetchSucceeded,
      status: liveFetchSucceeded ? "healthy" : "degraded",
    },
    cash: {
      current: currencyAmount(cashCurrent),
      available: currencyAmount(cashAvailable),
    },
    plaidLinkedDebt: {
      creditLoan: currencyAmount(plaidCreditLoanDebt),
    },
    manualLedgerDebt: {
      total: currencyAmount(input.manualDebts.reduce((sum, debt) => sum + finiteAmount(debt.remainingBalance), 0)),
      count: input.manualDebts.length,
    },
    accountCounts,
    unmappedUnknownAccountCount,
    freshness: {
      status: liveFetchSucceeded ? "fresh" : "untrusted",
      sourceAgeMs: 0,
    },
    completeness: {
      status: coverageUnresolved ? "incomplete" : "complete",
      expectedCoverageResolved: !coverageUnresolved,
      unresolvedConnections: input.connectionHealth.failed,
      unmappedUnknownAccounts: unmappedUnknownAccountCount,
    },
    // No deduplication mapping schema exists yet, so aggregate sources must not be merged.
    combinedDebtStatus: "needs_mapping",
    baselineStatus,
  };
}
