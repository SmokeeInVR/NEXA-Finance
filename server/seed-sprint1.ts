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

    // Recurring critical household bills (6 items)
    const recurringBills = [
      {
        name: "Apartment Rent (NEW)",
        amount: "1317.00",
        dueDay: 3,
        category: "HOUSING",
        isVariable: false,
        importance: "critical",
        startDate: "2026-08-14", // Move-in date
        endDate: null,
        notes: "New apartment starting Aug 14, 2026 (monthly)",
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
        notes: "Car and renters insurance (monthly)",
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
        notes: "Internet service (monthly)",
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
        notes: "Mobile phone service (monthly, variable)",
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
        notes: "Electric utility (monthly, variable)",
      },
    ];

    // One-time bills (separate category)
    const oneTimeBills = [
      {
        name: "Apartment Move-In (One-Time)",
        amount: "576.88",
        dueDay: 14,
        category: "HOUSING",
        isVariable: false,
        importance: "critical",
        startDate: "2026-08-14",
        endDate: "2026-08-14",
        notes: "One-time move-in cost - Aug 14, 2026",
      },
    ];

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

    // Calculate weekly values (dividing monthly by 4.33 weeks/month)
    // Monthly: Income $4,120 = Weekly $951.15
    // Monthly: Household bills $2,596.12 = Weekly $599.10
    // Monthly: Debt $697.21 = Weekly $160.94
    // Monthly: Groceries+Gas ~$600 = Weekly $138.55
    // Total expenses: $898.59; Surplus: $52.56
    // Note: house fund allocation ($175/week) comes from surplus for debt paydown phase

    const snapshot = await db
      .insert(weeklySnapshots)
      .values({
        weekStartDate: weekStart,
        householdIncome: "1030", // $670 inspection (variable) + $360 employment (fixed)
        householdExpense: "738", // $599 bills + $139 groceries/gas (weekly average)
        debtPayment: "161", // $697 monthly / 4.33 weeks
        houseFundAllocation: "53", // Remaining surplus after expenses
        surplus: "53",
        status: "on_track",
        notes: "Sprint 1 baseline: weekly snapshot for USDA 24-month trail",
      })
      .onConflictDoNothing()
      .returning();

    if (snapshot.length > 0) {
      console.log(`   ✓ Weekly snapshot created for week of ${weekStart}`);
      console.log(`     Income: $1,030 | Expenses: $738 | Debt: $161 | House Fund: $53 | Surplus: $53\n`);
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
