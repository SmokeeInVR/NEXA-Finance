import { db } from "./db";
import { accounts, billsRegistry, weeklySnapshots } from "@shared/schema";

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

    const billsToCreate = [
      {
        name: "Apartment Rent (NEW)",
        amount: "1317.00",
        dueDay: 3,
        category: "HOUSING",
        isVariable: false,
        importance: "critical",
        startDate: "2026-08-14", // Move-in date
        endDate: null,
        notes: "New apartment starting Aug 14, 2026",
      },
      {
        name: "Apartment Move-In",
        amount: "576.88",
        dueDay: 14,
        category: "HOUSING",
        isVariable: false,
        importance: "critical",
        startDate: "2026-08-14",
        endDate: "2026-08-14",
        notes: "One-time move-in cost",
      },
      {
        name: "Insurance (Auto + Renters)",
        amount: "229.96",
        dueDay: 9,
        category: "AUTO_RENTERS",
        isVariable: false,
        importance: "critical",
        startDate: "2026-06-14",
        endDate: null,
        notes: "Car and renters insurance",
      },
      {
        name: "Cox Internet",
        amount: "124.00",
        dueDay: 11,
        category: "INTERNET",
        isVariable: false,
        importance: "critical",
        startDate: "2026-06-14",
        endDate: null,
        notes: "Internet service",
      },
      {
        name: "Verizon Wireless Phone",
        amount: "195.53",
        dueDay: 12,
        category: "PHONE_COMMS",
        isVariable: true,
        importance: "critical",
        startDate: "2026-06-14",
        endDate: null,
        notes: "Mobile phone service (variable)",
      },
      {
        name: "APS Electric",
        amount: "152.75",
        dueDay: 13,
        category: "UTILITIES",
        isVariable: true,
        importance: "critical",
        startDate: "2026-06-14",
        endDate: null,
        notes: "Electric utility (variable)",
      },
    ];

    for (const bill of billsToCreate) {
      const result = await db
        .insert(billsRegistry)
        .values(bill)
        .onConflictDoNothing()
        .returning();

      if (result.length > 0) {
        console.log(`   ✓ ${bill.name} ($${bill.amount})`);
      }
    }

    console.log(`\n   ✓ ${billsToCreate.length} critical household bills registered\n`);

    // 3. Initialize weekly snapshot (this week's baseline)
    console.log("📊 Creating weekly snapshot baseline...");

    const today = new Date();
    const weekStartDate = new Date(today);
    weekStartDate.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)

    const weekStart = weekStartDate.toISOString().split("T")[0];

    const snapshot = await db
      .insert(weeklySnapshots)
      .values({
        weekStartDate: weekStart,
        householdIncome: "4120", // ~$670/week inspection + $360/week employment
        householdExpense: "2595", // Critical bills only
        debtPayment: "697", // Car payments
        houseFundAllocation: "175",
        surplus: "202",
        status: "on_track",
        notes: "Sprint 1 baseline snapshot",
      })
      .onConflictDoNothing()
      .returning();

    if (snapshot.length > 0) {
      console.log(`   ✓ Weekly snapshot created for week of ${weekStart}\n`);
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
