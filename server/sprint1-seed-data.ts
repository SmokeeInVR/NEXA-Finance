export type Sprint1BillsRegistry = {
  recurring: Array<{
    name: string;
    amount: string;
    dueDay: number;
    category: string;
    isVariable: boolean;
    importance: string;
    startDate: string;
    endDate: string | null;
    notes: string;
  }>;
  oneTime: Array<{
    name: string;
    amount: string;
    dueDay: number;
    category: string;
    isVariable: boolean;
    importance: string;
    startDate: string;
    endDate: string | null;
    notes: string;
  }>;
};

const GROCERIES_AND_GAS_WEEKLY = 139;
const HOUSEHOLD_INCOME_WEEKLY = 1030;
const DEBT_PAYMENT_WEEKLY = 161;
const WEEKS_PER_MONTH = 4.33;

const SPRINT1_RECURRING_BILLS: Sprint1BillsRegistry["recurring"] = [
  {
    name: "Apartment Rent (Current Lease)",
    amount: "1950.00",
    dueDay: 3,
    category: "HOUSING",
    isVariable: false,
    importance: "critical",
    startDate: "2026-06-14",
    endDate: "2026-08-13",
    notes: "Current apartment rent through final 2 months before move",
  },
  {
    name: "Apartment Rent (New Apartment)",
    amount: "1317.00",
    dueDay: 3,
    category: "HOUSING",
    isVariable: false,
    importance: "critical",
    startDate: "2026-08-14",
    endDate: null,
    notes: "New apartment rent starts Aug 14, 2026",
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

const SPRINT1_ONE_TIME_BILLS: Sprint1BillsRegistry["oneTime"] = [
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

function sumBillAmounts(bills: Array<{ amount: string }>) {
  return bills.reduce((total, bill) => total + Number.parseFloat(bill.amount), 0);
}

function normalizeDate(value: string | Date) {
  const parsed = value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00`);
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function isActiveOnDate(
  bill: Sprint1BillsRegistry["recurring"][number],
  referenceDate: Date,
) {
  const startDate = normalizeDate(bill.startDate);
  const endDate = bill.endDate ? normalizeDate(bill.endDate) : null;
  return startDate <= referenceDate && (!endDate || endDate >= referenceDate);
}

export function getSprint1BillsRegistry(referenceDate: Date = new Date()): Sprint1BillsRegistry & {
  recurringTotal: string;
  activeRecurringTotal: string;
  futureRecurringTotal: string;
  oneTimeTotal: string;
  totalMonthly: string;
} {
  const normalizedReferenceDate = normalizeDate(referenceDate);
  const activeRecurring = SPRINT1_RECURRING_BILLS.filter((bill) => isActiveOnDate(bill, normalizedReferenceDate));
  const futureRecurring = SPRINT1_RECURRING_BILLS.filter(
    (bill) => normalizeDate(bill.startDate) > normalizedReferenceDate,
  );

  const activeRecurringTotal = sumBillAmounts(activeRecurring);
  const futureRecurringTotal = sumBillAmounts(futureRecurring);
  const oneTimeTotal = sumBillAmounts(SPRINT1_ONE_TIME_BILLS);

  return {
    recurring: SPRINT1_RECURRING_BILLS,
    oneTime: SPRINT1_ONE_TIME_BILLS,
    recurringTotal: activeRecurringTotal.toFixed(2),
    activeRecurringTotal: activeRecurringTotal.toFixed(2),
    futureRecurringTotal: futureRecurringTotal.toFixed(2),
    oneTimeTotal: oneTimeTotal.toFixed(2),
    totalMonthly: (activeRecurringTotal + oneTimeTotal).toFixed(2),
  };
}

export function getSprint1WeeklySnapshot(referenceDate: Date = new Date()) {
  const { activeRecurringTotal } = getSprint1BillsRegistry(referenceDate);
  const weeklyBills = Number.parseFloat(activeRecurringTotal) / WEEKS_PER_MONTH;
  const householdIncome = HOUSEHOLD_INCOME_WEEKLY;
  const householdExpense = Math.round((weeklyBills + GROCERIES_AND_GAS_WEEKLY) * 100) / 100;
  const debtPayment = DEBT_PAYMENT_WEEKLY;
  const surplus = Math.round((householdIncome - householdExpense - debtPayment) * 100) / 100;

  return {
    householdIncome: householdIncome.toFixed(2),
    householdExpense: householdExpense.toFixed(2),
    debtPayment: debtPayment.toFixed(2),
    houseFundAllocation: surplus.toFixed(2),
    surplus: surplus.toFixed(2),
  };
}
