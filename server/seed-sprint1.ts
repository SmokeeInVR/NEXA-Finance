import { db } from "./db";
import { accounts, billsRegistry, weeklySnapshots } from "@shared/schema";
import {
  getSprint1BillsRegistry,
  getSprint1WeeklySnapshot,
} from "./sprint1-seed-data";

/**
 * Sprint 1 Seed: Initialize Bills Registry and House Fund account
 * Run with: node node_modules/tsx/dist/cli.mjs server/seed-sprint1.ts
 */

async function seedSprint1() {
  console.log("Sprint 1 Seed: Initializing Bills Registry and House Fund...\n");

  try {
    console.log("Creating House Fund account...");
    const houseFund = await db
      .insert(accounts)
      .values({
        name: "House Fund",
        type: "bucket",
        isActive: true,
        startingBalance: "0",
        excludeFromTotals: false,
      })
      .onConflictDoNothing()
      .returning();

    if (houseFund.length > 0) {
      console.log(`   OK House Fund created (ID: ${houseFund[0].id})\n`);
    } else {
      console.log("   INFO House Fund already exists\n");
    }

    console.log("Populating Bills Registry...");

    const planningDate = new Date();
    const {
      recurring: recurringBills,
      oneTime: oneTimeBills,
      activeRecurringTotal,
      futureRecurringTotal,
    } = getSprint1BillsRegistry(planningDate);

    let billCount = 0;

    for (const bill of recurringBills) {
      const result = await db
        .insert(billsRegistry)
        .values(bill)
        .onConflictDoNothing()
        .returning();

      if (result.length > 0) {
        console.log(`   OK ${bill.name} ($${bill.amount})`);
        billCount++;
      }
    }

    for (const bill of oneTimeBills) {
      const result = await db
        .insert(billsRegistry)
        .values(bill)
        .onConflictDoNothing()
        .returning();

      if (result.length > 0) {
        console.log(`   OK ${bill.name} ($${bill.amount}) [ONE-TIME]`);
        billCount++;
      }
    }

    console.log(`\n   OK ${billCount} household planning bills registered (${recurringBills.length} recurring + ${oneTimeBills.length} one-time)`);
    console.log(`   OK Active recurring baseline: $${activeRecurringTotal}/month`);
    console.log(`   OK Future recurring baseline after move: $${futureRecurringTotal}/month\n`);

    console.log("Creating weekly snapshot baseline...");

    const today = new Date();
    const weekStartDate = new Date(today);
    weekStartDate.setDate(today.getDate() - today.getDay());
    const weekStart = weekStartDate.toISOString().split("T")[0];

    const weeklySnapshot = getSprint1WeeklySnapshot(today);

    const snapshot = await db
      .insert(weeklySnapshots)
      .values({
        weekStartDate: weekStart,
        ...weeklySnapshot,
        status: "on_track",
        notes: "Sprint 1 baseline: current lease active until move date; future apartment tracked separately",
      })
      .onConflictDoNothing()
      .returning();

    if (snapshot.length > 0) {
      console.log(`   OK Weekly snapshot created for week of ${weekStart}`);
      console.log(
        `     Income: $${weeklySnapshot.householdIncome} | Expenses: $${weeklySnapshot.householdExpense} | Debt: $${weeklySnapshot.debtPayment} | House Fund: $${weeklySnapshot.houseFundAllocation} | Surplus: $${weeklySnapshot.surplus}\n`,
      );
    }

    console.log("Sprint 1 seed complete.\n");
    console.log("Next steps:");
    console.log("   1. Verify Bills Registry via: SELECT * FROM bills_registry");
    console.log("   2. Verify House Fund account created");
    console.log("   3. Run: npm run build");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

seedSprint1();
