import { parse, addMonths, getDaysInMonth } from "date-fns";

// 24-month bills payment history: Jan 2024 - Dec 2025
// 6 recurring bills × 24 months = 144 payment records
// Plus the one-time move-in cost (1 record)

const RECURRING_BILLS = [
  { id: 1, name: "Rent", dueDay: 3, amount: 1317.0 },
  { id: 2, name: "Insurance", dueDay: 9, amount: 229.96 },
  { id: 3, name: "Internet", dueDay: 13, amount: 124.0 },
  { id: 4, name: "Utilities", dueDay: 21, amount: 195.53 },
  { id: 5, name: "Groceries & Food", dueDay: 27, amount: 152.75 },
  { id: 6, name: "Subscriptions", dueDay: 1, amount: null }, // Will be calculated from monthly total
];

// One-time bill: move-in cost on Aug 14, 2026 (but we're seeding history up to Dec 2025)
// So move-in won't appear in this 24-month seed

function generatePaymentHistory() {
  const payments: any[] = [];
  let paymentId = 1;

  // Generate 24 months of payment records (Jan 2024 - Dec 2025)
  let currentDate = parse("2024-01-01", "yyyy-MM-dd", new Date());
  const endDate = parse("2025-12-31", "yyyy-MM-dd", new Date());

  let monthIndex = 0;

  while (currentDate <= endDate) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(currentDate);

    // For each recurring bill, create a payment record for this month
    let monthlyTotal = 0;
    const monthPayments: any[] = [];

    for (const bill of RECURRING_BILLS) {
      if (bill.id === 6) continue; // Handle subscriptions specially

      const dueDay = Math.min(bill.dueDay, daysInMonth);
      const paymentDate = new Date(year, month, dueDay);
      const dateStr = paymentDate.toISOString().split("T")[0];

      // Add slight variance (~±2% to mimic reality)
      const variance = 0.98 + Math.random() * 0.04;
      const amount = Math.round(bill.amount * variance * 100) / 100;

      monthlyTotal += amount;
      monthPayments.push({
        paymentId: paymentId++,
        billId: bill.id,
        billName: bill.name,
        paidDate: dateStr,
        amount: amount.toString(),
        status: "paid",
        month: monthIndex,
      });
    }

    // Subscriptions bill (ID 6) = remaining amount to reach $2,019.24 total
    const subscriptionAmount = Math.round((2019.24 - monthlyTotal) * 100) / 100;
    const subDueDay = Math.min(1, daysInMonth);
    const subPaymentDate = new Date(year, month, subDueDay);
    const subDateStr = subPaymentDate.toISOString().split("T")[0];

    monthPayments.push({
      paymentId: paymentId++,
      billId: 6,
      billName: "Subscriptions",
      paidDate: subDateStr,
      amount: subscriptionAmount.toString(),
      status: "paid",
      month: monthIndex,
    });

    payments.push(...monthPayments);

    // Move to next month
    currentDate = addMonths(currentDate, 1);
    monthIndex++;
  }

  return payments;
}

async function seedBillsPaymentHistory() {
  try {
    const payments = generatePaymentHistory();

    console.log(`Generated ${payments.length} payment records`);
    console.log(`Date range: Jan 2024 - Dec 2025 (24 months)`);

    // Verify totals
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const expectedTotal = 2019.24 * 24;
    console.log(`Total paid: $${totalPaid.toFixed(2)} (expected ~$${expectedTotal.toFixed(2)})`);

    // Show breakdown by bill
    const billBreakdown: { [key: string]: number } = {};
    payments.forEach(p => {
      billBreakdown[p.billName] = (billBreakdown[p.billName] || 0) + parseFloat(p.amount);
    });

    console.log("\nPayment breakdown (24-month total):");
    Object.entries(billBreakdown).forEach(([name, total]) => {
      console.log(`  ${name}: $${(total / 24).toFixed(2)}/month = $${total.toFixed(2)}/year`);
    });

    console.log("\n✓ Phase 3C bills payment history seed ready for database insertion");

    return payments;
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

export { generatePaymentHistory, seedBillsPaymentHistory };

if (require.main === module) {
  seedBillsPaymentHistory().then(payments => {
    console.log(`\nPayment array (first 6 - Jan 2024):`);
    console.log(JSON.stringify(payments.slice(0, 6), null, 2));
  });
}
