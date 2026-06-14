import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getSprint1BillsRegistry,
  getSprint1WeeklySnapshot,
} from "../sprint1-seed-data.ts";

describe("Sprint 1 seed data", () => {
  it("reconciles the weekly snapshot baseline", () => {
    const snapshot = getSprint1WeeklySnapshot();

    assert.equal(snapshot.householdIncome, "1030");
    assert.equal(snapshot.householdExpense, "738");
    assert.equal(snapshot.debtPayment, "161");
    assert.equal(snapshot.houseFundAllocation, "131");
    assert.equal(snapshot.surplus, "131");
  });

  it("separates recurring and one-time bills with correct totals", () => {
    const registry = getSprint1BillsRegistry();

    assert.equal(registry.recurring.length, 5);
    assert.equal(registry.oneTime.length, 1);
    assert.equal(registry.recurringTotal, "2019.24");
    assert.equal(registry.oneTimeTotal, "576.88");
    assert.equal(registry.totalMonthly, "2596.12");
  });
});
