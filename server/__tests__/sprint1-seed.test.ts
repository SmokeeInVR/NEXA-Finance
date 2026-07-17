import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getSprint1BillsRegistry,
  getSprint1WeeklySnapshot,
} from "../sprint1-seed-data.ts";

describe("Sprint 1 seed data", () => {
  it("reconciles the weekly snapshot baseline", () => {
    const snapshot = getSprint1WeeklySnapshot(new Date("2026-06-15T00:00:00"));

    assert.equal(snapshot.householdIncome, "1030.00");
    assert.equal(snapshot.householdExpense, "751.53");
    assert.equal(snapshot.debtPayment, "161.00");
    assert.equal(snapshot.houseFundAllocation, "117.47");
    assert.equal(snapshot.surplus, "117.47");
  });

  it("separates active recurring, future recurring, and one-time housing totals", () => {
    const registry = getSprint1BillsRegistry(new Date("2026-06-15T00:00:00"));

    assert.equal(registry.recurring.length, 6);
    assert.equal(registry.oneTime.length, 1);
    assert.equal(registry.activeRecurringTotal, "2652.24");
    assert.equal(registry.futureRecurringTotal, "1317.00");
    assert.equal(registry.oneTimeTotal, "576.88");
    assert.equal(registry.totalMonthly, "3229.12");
  });
});
