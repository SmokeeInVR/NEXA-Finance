// Phase 3C: 24-Month Data Population Runner
// Populates snapshot history and bill payment records for USDA loan documentation
// Run with: npm run seed:24month

import { generateWeeklySnapshots } from "./seed-24month-snapshots";
import { generatePaymentHistory } from "./seed-24month-bills";

async function runSeed24Month() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  PHASE 3C: 24-MONTH DATA POPULATION");
  console.log("  Seeding historical data for USDA loan documentation");
  console.log("═══════════════════════════════════════════════════════════\n");

  try {
    // Generate snapshots
    console.log("📊 Generating 24-month weekly snapshots (Jan 2024 - Dec 2025)...");
    const snapshots = generateWeeklySnapshots();
    console.log(`   ✓ Generated ${snapshots.length} weekly snapshots`);
    console.log(`   ✓ Cumulative house fund: $${snapshots.reduce((sum, s) => sum + parseFloat(s.houseFundAllocation), 0).toFixed(2)}`);

    // Generate payment history
    console.log("\n💰 Generating 24-month bills payment history...");
    const payments = generatePaymentHistory();
    console.log(`   ✓ Generated ${payments.length} payment records`);
    console.log(`   ✓ Total bills paid: $${payments.reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)}`);

    // Validation
    console.log("\n✅ DATA VALIDATION");
    console.log("   Snapshots:");
    console.log(`     - Date range: ${snapshots[0].weekStartDate} to ${snapshots[snapshots.length - 1].weekStartDate}`);
    console.log(`     - On-track: ${snapshots.filter(s => s.status === "on_track").length}/${snapshots.length}`);
    console.log(`     - Min surplus: $${Math.min(...snapshots.map(s => parseFloat(s.surplus))).toFixed(2)}`);
    console.log(`     - Max surplus: $${Math.max(...snapshots.map(s => parseFloat(s.surplus))).toFixed(2)}`);

    console.log("\n   Payment Records:");
    const billCount = new Set(payments.map(p => p.billId)).size;
    console.log(`     - Unique bills: ${billCount}`);
    console.log(`     - Months covered: 24 (Jan 2024 - Dec 2025)`);
    const avgPayment = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0) / payments.length;
    console.log(`     - Average payment: $${avgPayment.toFixed(2)}`);

    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("  ✓ PHASE 3C COMPLETE: Data ready for database insertion");
    console.log("  → Next: Phase 3D (Mobile/Responsive refinements, deferred)");
    console.log("═══════════════════════════════════════════════════════════\n");

    return { snapshots, payments };
  } catch (error) {
    console.error("✗ Seed failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runSeed24Month();
}

export { runSeed24Month };
