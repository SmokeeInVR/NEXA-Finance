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
  console.log("🌱 Sprint 1 Seed: Initializing Bills Registry & House Fund...\n");

  try {
    // 1. Create House Fund account (if not exists)
    console.log("📌 Creating House Fund account...");
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
      console.log(`   ✓ House Fund created (ID: ${houseFund[0].id})\n`);
    } else {
      console.log("   ℹ House Fund already exists\n");
    }

    // 2. Create Bills Registry entries
    console.log("📋 Populating Bills Registry...");

    const { recurring: recurringBills, oneTime: oneTimeBills } = getSprint1BillsRegistry();

    let billCount = 0;

    for (const bill of recurringBills) {
      const result = await db
        .insert(billsRegistry)
        .values(bill)
        .onConflictDoNothing()
        .returning();

      if (result.length > 0) {
        console.log(`   ✓ ${bill.name} ($${bill.amount})`);
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
        console.log(`   ✓ ${bill.name} ($${bill.amount}) [ONE-TIME]`);
        billCount++;
      }
    }

    console.log(`\n   ✓ ${billCount} critical household bills registered (5 recurring + 1 one-time)\n`);

    // 3. Initialize weekly snapshot (this week's baseline)
    console.log("📊 Creating weekly snapshot baseline...");

    const today = new Date();
    const weekStartDate = new Date(today);
    weekStartDate.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)

    const weekStart = weekStartDate.toISOString().split("T")[0];

    // Weekly baseline is computed from the active target budget.
    // Income: $1,030; Expenses: $738; Debt: $161; Surplus: $131.
    // House fund allocation matches the computed surplus in this baseline.
    const weeklySnapshot = getSprint1WeeklySnapshot();

    const snapshot = await db
      .insert(weeklySnapshots)
      .values({
        weekStartDate: weekStart,
        ...weeklySnapshot,
        status: "on_track",
        notes: "Sprint 1 baseline: weekly snapshot for USDA 24-month trail",
      })
      .onConflictDoNothing()
      .returning();

    if (snapshot.length > 0) {
      console.log(`   ✓ Weekly snapshot created for week of ${weekStart}`);
      console.log(`     Income: $1,030 | Expenses: $738 | Debt: $161 | House Fund: $131 | Surplus: $131\n`);
    }

    console.log("✅ Sprint 1 seed complete!\n");
    console.log("📌 Next steps:");
    console.log("   1. Verify Bills Registry via: SELECT * FROM bills_registry");
    console.log("   2. Verify House Fund account created");
    console.log("   3. Run: npm run build");
    console.log("   4. Commit: git add shared/schema.ts && git commit -m 'Sprint 1: Add bills tracking tables'\n");

  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seedSprint1();
