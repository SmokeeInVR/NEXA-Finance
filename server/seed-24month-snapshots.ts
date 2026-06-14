import { parse } from "date-fns";

// 24-month snapshot seed: Jan 2024 - Dec 2025 (104 weekly snapshots)
// Fixed baseline: income 1030 - expense 738 - debt 161 = surplus 131

const BASELINE_INCOME = 1030;
const BASELINE_EXPENSE = 738;
const BASELINE_DEBT = 161;
const BASELINE_SURPLUS = 131;

// Start date: 2 years back from June 14, 2026
// Jan 1, 2024 (Monday) is our first week start date
const FIRST_WEEK_START = "2024-01-01";

function generateWeeklySnapshots() {
  const snapshots: any[] = [];

  // Generate 104 weekly snapshots (26 weeks/year × 4 years... wait, we need 2 years)
  // Actually: ~52 weeks per year × 2 years = 104 weeks
  const startDate = parse(FIRST_WEEK_START, "yyyy-MM-dd", new Date());

  for (let i = 0; i < 104; i++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + i * 7);

    const dateStr = weekStart.toISOString().split("T")[0];

    // Vary income/expense slightly for realism (~±5% variance)
    const incomeFactor = 0.95 + Math.random() * 0.1; // 95-105%
    const expenseFactor = 0.95 + Math.random() * 0.1;
    const debtFactor = 0.9 + Math.random() * 0.2; // 90-110% (debt varies more)

    const income = Math.round(BASELINE_INCOME * incomeFactor * 100) / 100;
    const expense = Math.round(BASELINE_EXPENSE * expenseFactor * 100) / 100;
    const debt = Math.round(BASELINE_DEBT * debtFactor * 100) / 100;
    const surplus = Math.round((income - expense - debt) * 100) / 100;

    // Status: on_track if cumulative house fund balance is on pace
    // Cumulative = week_number * 131
    const cumulativeExpected = (i + 1) * BASELINE_SURPLUS;
    const cumulativeActual = (i + 1) * surplus;
    const status = cumulativeActual >= cumulativeExpected * 0.95 ? "on_track" : "shortfall";

    snapshots.push({
      id: i + 1,
      weekStartDate: dateStr,
      householdIncome: income.toString(),
      householdExpense: expense.toString(),
      debtPayment: debt.toString(),
      surplus: surplus.toString(),
      houseFundAllocation: surplus.toString(), // Same as surplus
      status,
    });
  }

  return snapshots;
}

async function seedSnapshots() {
  try {
    const snapshots = generateWeeklySnapshots();

    console.log(`Generated ${snapshots.length} weekly snapshots`);
    console.log(`Date range: ${snapshots[0].weekStartDate} to ${snapshots[snapshots.length - 1].weekStartDate}`);
    console.log(`Total house fund allocation: $${snapshots.reduce((sum, s) => sum + parseFloat(s.houseFundAllocation), 0).toFixed(2)}`);
    console.log(`On-track weeks: ${snapshots.filter(s => s.status === "on_track").length}`);
    console.log(`Shortfall weeks: ${snapshots.filter(s => s.status === "shortfall").length}`);

    // In a real app, this would insert into database
    console.log("\n✓ Phase 3C snapshot seed ready for database insertion");

    return snapshots;
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

// Export for use in other modules
export { generateWeeklySnapshots, seedSnapshots };

// Run if called directly
if (require.main === module) {
  seedSnapshots().then(snapshots => {
    console.log(`\nSnapshot array (first 5):`);
    console.log(JSON.stringify(snapshots.slice(0, 5), null, 2));
  });
}
