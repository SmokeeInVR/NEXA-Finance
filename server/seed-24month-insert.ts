// Phase 3E: Database Insertion
// Inserts Phase 3C generated 24-month data into live database
// 104 snapshots → weekly_snapshots table
// 144 payment records → transactions table (type="bill_payment")

import { db } from "./db";
import { weeklySnapshots, transactions } from "../shared/schema";
import { eq } from "drizzle-orm";
import { generateWeeklySnapshots } from "./seed-24month-snapshots";
import { generatePaymentHistory } from "./seed-24month-bills";

async function insertPhase3EData() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  PHASE 3E: DATABASE INSERTION");
  console.log("  Inserting Phase 3C generated 24-month history into live DB");
  console.log("═══════════════════════════════════════════════════════════\n");

  try {
    // Step 1: Generate Phase 3C data
    console.log("📊 Generating Phase 3C snapshot data...");
    const snapshots = generateWeeklySnapshots();
    console.log(`   ✓ Generated ${snapshots.length} snapshots`);

    console.log("\n💰 Generating Phase 3C payment history...");
    const paymentRecords = generatePaymentHistory();
    console.log(`   ✓ Generated ${paymentRecords.length} payment records`);

    // Step 2: Check for existing data (idempotency guard)
    console.log("\n🔍 Checking for existing data (idempotency)...");
    const existingSnapshots = await db
      .select()
      .from(weeklySnapshots)
      .where(eq(weeklySnapshots.weekStartDate, snapshots[0].weekStartDate));

    if (existingSnapshots.length > 0) {
      console.log("   ⚠️  Snapshots for 2024-01-01 already exist. Skipping insertion.");
      console.log("   To reimport, delete existing records first.");
      process.exit(0);
    }
    console.log("   ✓ No existing data found. Safe to insert.");

    // Step 3: Insert snapshots into weekly_snapshots table
    console.log("\n📥 Inserting snapshots into weekly_snapshots...");
    const snapshotInsertData = snapshots.map((snap) => ({
      weekStartDate: snap.weekStartDate,
      householdIncome: snap.householdIncome,
      householdExpense: snap.householdExpense,
      debtPayment: snap.debtPayment,
      houseFundAllocation: snap.houseFundAllocation,
      surplus: snap.surplus,
      status: snap.status as "ahead" | "on_track" | "behind",
      notes: null,
    }));

    const insertedSnapshots = await db
      .insert(weeklySnapshots)
      .values(snapshotInsertData)
      .returning();

    console.log(`   ✓ Inserted ${insertedSnapshots.length} snapshots`);
    console.log(
      `   ✓ Date range: ${insertedSnapshots[0].weekStartDate} to ${insertedSnapshots[insertedSnapshots.length - 1].weekStartDate}`
    );

    // Step 4: Transform and insert payment records as transactions
    console.log("\n📥 Inserting payment records as transactions (type=bill_payment)...");

    const transactionInsertData = paymentRecords.map((payment) => ({
      date: payment.paidDate,
      type: "bill_payment" as const,
      amount: payment.amount,
      category: payment.billName,
      notes: JSON.stringify({
        billId: payment.billId,
        month: payment.month,
        status: payment.status,
      }),
      fromAccountId: null, // Will be set by app logic or user
      toAccountId: null,
      debtId: null,
      createdBy: "Phase3E-Seed",
    }));

    const insertedTransactions = await db
      .insert(transactions)
      .values(transactionInsertData)
      .returning();

    console.log(`   ✓ Inserted ${insertedTransactions.length} transactions`);
    const billPayments = insertedTransactions.filter((t) => t.type === "bill_payment");
    console.log(`   ✓ Bill payments: ${billPayments.length}`);

    // Step 5: Validation Summary
    console.log("\n✅ INSERTION COMPLETE");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("  SUMMARY");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`  Snapshots inserted: ${insertedSnapshots.length}`);
    console.log(`  Transactions inserted: ${billPayments.length}`);
    console.log(`  Date range: 2024-01-01 to 2025-12-22`);
    console.log(`  Duplicates skipped: 0`);
    console.log("\n  NEXT STEPS:");
    console.log("  1. Query /api/weekly-snapshots → verify 104 records");
    console.log("  2. Query /api/transactions?type=bill_payment → verify 144 records");
    console.log("  3. Run Sprint 3 tests → confirm no regressions");
    console.log("  4. Mark Phase 3E complete in documentation");
    console.log("═══════════════════════════════════════════════════════════\n");

    return {
      snapshotsInserted: insertedSnapshots.length,
      transactionsInserted: billPayments.length,
      dateRange: {
        start: insertedSnapshots[0].weekStartDate,
        end: insertedSnapshots[insertedSnapshots.length - 1].weekStartDate,
      },
      status: "complete",
    };
  } catch (error) {
    console.error("✗ Insertion failed:", error);
    process.exit(1);
  }
}

insertPhase3EData();
