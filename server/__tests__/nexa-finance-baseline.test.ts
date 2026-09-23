import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildNexaFinanceBaseline } from "../nexa-finance-baseline";

describe("NEXA finance baseline", () => {
  it("returns only aggregate live cash/debt data and keeps manual debt separate", () => {
    const baseline = buildNexaFinanceBaseline({
      fetchedAt: new Date("2026-09-23T12:00:00.000Z"),
      connectionHealth: { configured: 1, attempted: 1, succeeded: 1, failed: 0 },
      plaidAccounts: [
        { type: "depository", balance: 1000, availableBalance: 900 },
        { type: "credit", balance: 250, availableBalance: null },
        { type: "loan", balance: 5000, availableBalance: null },
        { type: "investment", balance: 400 },
        { type: "mystery", balance: 10 },
      ],
      manualDebts: [{ remainingBalance: 800 }],
    });

    assert.deepEqual(Object.keys(baseline).sort(), [
      "accountCounts", "baselineStatus", "cash", "combinedDebtStatus", "completeness",
      "connectionHealth", "freshness", "manualLedgerDebt", "plaidLinkedDebt", "sourceFetchedAt",
      "unmappedUnknownAccountCount",
    ].sort());
    assert.deepEqual(baseline.cash, { current: 1000, available: 900 });
    assert.deepEqual(baseline.plaidLinkedDebt, { creditLoan: 5250 });
    assert.deepEqual(baseline.manualLedgerDebt, { total: 800, count: 1 });
    assert.equal(baseline.accountCounts.cash, 1);
    assert.equal(baseline.unmappedUnknownAccountCount, 1);
    assert.equal(baseline.combinedDebtStatus, "needs_mapping");
    assert.equal(baseline.baselineStatus, "incomplete");
    assert.equal(JSON.stringify(baseline).match(/accountId|name|mask|institution|accessToken|transaction/i), null);
  });

  it("marks the baseline incomplete when a configured Plaid connection cannot be fetched", () => {
    const baseline = buildNexaFinanceBaseline({
      fetchedAt: new Date("2026-09-23T12:00:00.000Z"),
      connectionHealth: { configured: 2, attempted: 2, succeeded: 1, failed: 1 },
      plaidAccounts: [{ type: "depository", balance: 50, availableBalance: 50 }],
      manualDebts: [],
    });

    assert.equal(baseline.connectionHealth.status, "degraded");
    assert.equal(baseline.completeness.status, "incomplete");
    assert.equal(baseline.baselineStatus, "incomplete");
  });
});
