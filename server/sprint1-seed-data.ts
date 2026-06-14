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

const SPRINT1_RECURRING_BILLS: Sprint1BillsRegistry["recurring"] = [
  {
    name: "Apartment Rent (NEW)",
    amount: "1317.00",
    dueDay: 3,
    category: "HOUSING",
    isVariable: false,
    importance: "critical",
    startDate: "2026-08-14",
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

export function getSprint1BillsRegistry(): Sprint1BillsRegistry & {
  recurringTotal: string;
  oneTimeTotal: string;
  totalMonthly: string;
} {
  const recurringTotal = sumBillAmounts(SPRINT1_RECURRING_BILLS);
  const oneTimeTotal = sumBillAmounts(SPRINT1_ONE_TIME_BILLS);

  return {
    recurring: SPRINT1_RECURRING_BILLS,
    oneTime: SPRINT1_ONE_TIME_BILLS,
    recurringTotal: recurringTotal.toFixed(2),
    oneTimeTotal: oneTimeTotal.toFixed(2),
    totalMonthly: (recurringTotal + oneTimeTotal).toFixed(2),
  };
}

export function getSprint1WeeklySnapshot() {
  const householdIncome = 1030;
  const householdExpense = 738;
  const debtPayment = 161;
  const surplus = householdIncome - householdExpense - debtPayment;

  return {
    householdIncome: householdIncome.toString(),
    householdExpense: householdExpense.toString(),
    debtPayment: debtPayment.toString(),
    houseFundAllocation: surplus.toString(),
    surplus: surplus.toString(),
  };
}
