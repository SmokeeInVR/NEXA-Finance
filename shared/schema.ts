import { pgTable, text, serial, integer, numeric, timestamp, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === Account Types ===
export const ACCOUNT_TYPES = ["personal", "spouse", "joint", "bucket", "business"] as const;
export type AccountType = typeof ACCOUNT_TYPES[number];

// === Transaction Types ===
export const TRANSACTION_TYPES = [
  "income", "spend", "transfer", "bill_contribution", 
  "bill_payment", "debt_payment", "adjustment"
] as const;
export type TransactionType = typeof TRANSACTION_TYPES[number];

// === Accounts (Ledger System) ===
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  type: text("type").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  startingBalance: numeric("starting_balance").notNull().default("0"),
  excludeFromTotals: boolean("exclude_from_totals").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === Transactions (Core Ledger) ===
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  type: text("type").notNull(),
  amount: numeric("amount").notNull(),
  fromAccountId: integer("from_account_id"),
  toAccountId: integer("to_account_id"),
  category: text("category"),
  debtId: integer("debt_id"),
  notes: text("notes"),
  createdBy: text("created_by").notNull().default("Me"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === Budget Settings (Single Row) ===
export const budgetSettings = pgTable("budget_settings", {
  id: serial("id").primaryKey(),
  monthlyFixedBills: numeric("monthly_fixed_bills").notNull().default("0"),
  splitMode: text("split_mode").notNull().default("AUTO"),
  mySplitPct: numeric("my_split_pct").notNull().default("50"),
  spouseSplitPct: numeric("spouse_split_pct").notNull().default("50"),
  savingsMode: text("savings_mode").notNull().default("PERCENT"),
  savingsValue: numeric("savings_value").notNull().default("0"),
  investingMode: text("investing_mode").notNull().default("PERCENT"),
  investingValue: numeric("investing_value").notNull().default("0"),
  debtBufferMode: text("debt_buffer_mode").notNull().default("PERCENT"),
  debtBufferValue: numeric("debt_buffer_value").notNull().default("0"),
  tradingMode: text("trading_mode").notNull().default("PERCENT"),
  tradingValue: numeric("trading_value").notNull().default("0"),
  allocationFrequency: text("allocation_frequency").notNull().default("MONTHLY"),
  incomeSource: text("income_source").notNull().default("MANUAL"),
  avgWindowWeeks: integer("avg_window_weeks").notNull().default(4),
  bufferGoalAmount: numeric("buffer_goal_amount").notNull().default("1000"),
  bufferRerouteEnabled: boolean("buffer_reroute_enabled").notNull().default(false),
  rerouteTarget: text("reroute_target").notNull().default("SAVINGS"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === Spending Log ===
export const spendingLogs = pgTable("spending_logs", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  amount: numeric("amount").notNull(),
  category: text("category").notNull(),
  paidBy: text("paid_by").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === Weekly Income Log ===
export const weeklyIncomeLogs = pgTable("weekly_income_logs", {
  id: serial("id").primaryKey(),
  weekStartDate: date("week_start_date").notNull().unique(),
  myIncome: numeric("my_income").notNull().default("0"),
  spouseIncome: numeric("spouse_income").notNull().default("0"),
  notes: text("notes"),
  deposited: boolean("deposited").notNull().default(false),
  myDepositAccountId: integer("my_deposit_account_id"),
  spouseDepositAccountId: integer("spouse_deposit_account_id"),
  myDepositAmount: numeric("my_deposit_amount"),
  spouseDepositAmount: numeric("spouse_deposit_amount"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === Weekly Cash Snapshots ===
export const weeklyCashSnapshots = pgTable("weekly_cash_snapshots", {
  id: serial("id").primaryKey(),
  weekStartDate: date("week_start_date").notNull().unique(),
  startingCash: numeric("starting_cash").notNull().default("0"),
  includeTrading: boolean("include_trading").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === Account Balances ===
export const accountBalances = pgTable("account_balances", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  balance: numeric("balance").notNull().default("0"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === Debts ===
export const debts = pgTable("debts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  balance: numeric("balance").notNull(),
  startingBalance: numeric("starting_balance"),
  apr: numeric("apr"),
  monthlyPayment: numeric("monthly_payment").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === Business Expenses ===
export const businessExpenses = pgTable("business_expenses", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  vendor: text("vendor").notNull(),
  category: text("category").notNull(),
  amount: numeric("amount").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === Mileage Entries ===
export const mileageEntries = pgTable("mileage_entries", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  startOdometer: integer("start_odometer"),
  endOdometer: integer("end_odometer"),
  miles: numeric("miles").notNull().default("0"),
  purpose: text("purpose").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === Business Income Log ===
export const businessIncomeLogs = pgTable("business_income_logs", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  amount: numeric("amount").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === Business Settings ===
export const businessSettings = pgTable("business_settings", {
  id: serial("id").primaryKey(),
  taxHoldPercent: numeric("tax_hold_percent").notNull().default("25"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === Bills Funding Log ===
export const billsFundingLogs = pgTable("bills_funding_logs", {
  id: serial("id").primaryKey(),
  weekStartDate: date("week_start_date").notNull().unique(),
  myTransfer: numeric("my_transfer").notNull().default("0"),
  spouseTransfer: numeric("spouse_transfer").notNull().default("0"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === Investment Settings (Single Row - FIRE Planning) ===
export const investmentSettings = pgTable("investment_settings", {
  id: serial("id").primaryKey(),
  investedBalance: numeric("invested_balance").notNull().default("0"),
  monthlyContribution: numeric("monthly_contribution").notNull().default("0"),
  safeWithdrawalRate: numeric("safe_withdrawal_rate").notNull().default("0.04"),
  targetMonthlyIncome: numeric("target_monthly_income").notNull().default("2000"),
  expectedAnnualReturn: numeric("expected_annual_return").notNull().default("0.07"),
  currentAge: integer("current_age").notNull().default(30),
  targetAge: integer("target_age").notNull().default(55),
  inflationRate: numeric("inflation_rate").notNull().default("0.02"),
  useInflationAdjustedGoal: boolean("use_inflation_adjusted_goal").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === Transfers ===
export const transfers = pgTable("transfers", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  fromAccountId: integer("from_account_id").notNull(),
  toAccountId: integer("to_account_id").notNull(),
  amount: numeric("amount").notNull(),
  note: text("note"),
  createdBy: text("created_by").notNull().default("Me"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === Campaign Data (Nexa OS quest system — syncs across devices) ===
export const campaignData = pgTable("campaign_data", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // always 'main' for now
  value: text("value").notNull(), // JSON blob
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type CampaignData = typeof campaignData.$inferSelect;

// === Bill Schedule ===
export const billSchedule = pgTable("bill_schedule", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  dueDay: integer("due_day").notNull(), // 1-31, day of month bill is due
  category: text("category").notNull().default("Other"),
  isVariable: boolean("is_variable").notNull().default(false), // true = estimated amount
  autopay: boolean("autopay").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === BASE SCHEMAS ===

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  type: z.enum(ACCOUNT_TYPES),
}).partial({
  excludeFromTotals: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
}).extend({
  type: z.enum(TRANSACTION_TYPES),
  amount: z.string().or(z.number()).refine(
    (val) => parseFloat(String(val)) > 0, 
    { message: "Amount must be greater than zero" }
  ),
  fromAccountId: z.number().nullable().optional(),
  toAccountId: z.number().nullable().optional(),
  debtId: z.number().nullable().optional(),
}).refine(
  (data) => {
    if (!data.fromAccountId && !data.toAccountId) return false;
    switch (data.type) {
      case "income":
        return !!data.toAccountId;
      case "spend":
      case "debt_payment":
        return !!data.fromAccountId;
      case "transfer":
      case "bill_contribution":
        return !!data.fromAccountId && !!data.toAccountId;
      default:
        return true;
    }
  },
  { message: "Invalid account configuration for transaction type" }
);

export const insertBudgetSettingsSchema = createInsertSchema(budgetSettings).omit({ 
  id: true, 
  updatedAt: true 
}).extend({
  incomeSource: z.enum(["MANUAL", "LOG_AVG"]).default("MANUAL"),
  avgWindowWeeks: z.number().default(4),
  bufferGoalAmount: z.string().or(z.number()).default("1000"),
  bufferRerouteEnabled: z.boolean().default(false),
  rerouteTarget: z.enum(["SAVINGS", "INVESTING"]).default("SAVINGS"),
});

export const insertSpendingLogSchema = createInsertSchema(spendingLogs).omit({
  id: true,
  createdAt: true,
});

export const insertWeeklyIncomeLogSchema = createInsertSchema(weeklyIncomeLogs).omit({
  id: true,
  createdAt: true,
}).extend({
  deposited: z.boolean().optional().default(false),
  myDepositAccountId: z.number().nullable().optional(),
  spouseDepositAccountId: z.number().nullable().optional(),
  myDepositAmount: z.string().nullable().optional(),
  spouseDepositAmount: z.string().nullable().optional(),
});

export const insertWeeklyCashSnapshotSchema = createInsertSchema(weeklyCashSnapshots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAccountBalanceSchema = createInsertSchema(accountBalances).omit({
  id: true,
  updatedAt: true,
});

export const insertDebtSchema = createInsertSchema(debts).omit({ 
  id: true, 
  createdAt: true 
});

export const insertBusinessExpenseSchema = createInsertSchema(businessExpenses).omit({ 
  id: true, 
  createdAt: true 
});

export const insertMileageEntrySchema = createInsertSchema(mileageEntries).omit({ 
  id: true, 
  createdAt: true 
});

export const insertBusinessIncomeLogSchema = createInsertSchema(businessIncomeLogs).omit({
  id: true,
  createdAt: true,
});

export const insertBusinessSettingsSchema = createInsertSchema(businessSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertBillsFundingLogSchema = createInsertSchema(billsFundingLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvestmentSettingsSchema = createInsertSchema(investmentSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertTransferSchema = createInsertSchema(transfers).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.string().or(z.number()).refine(
    (val) => parseFloat(String(val)) > 0,
    { message: "Amount must be greater than zero" }
  ),
  createdBy: z.enum(["Me", "Spouse", "Joint"]).default("Me"),
}).refine(
  (data) => data.fromAccountId !== data.toAccountId,
  { message: "From and To accounts must be different" }
);

export const insertBillScheduleSchema = createInsertSchema(billSchedule).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.string().or(z.number()),
  dueDay: z.number().int().min(1).max(31),
  isVariable: z.boolean().default(false),
  autopay: z.boolean().default(false),
});

// === TYPES ===
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;

export interface AccountWithBalance extends Account {
  currentBalance: number;
}

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type BudgetSettings = typeof budgetSettings.$inferSelect;
export type InsertBudgetSettings = z.infer<typeof insertBudgetSettingsSchema>;

export type SpendingLog = typeof spendingLogs.$inferSelect;
export type InsertSpendingLog = z.infer<typeof insertSpendingLogSchema>;

export type WeeklyIncomeLog = typeof weeklyIncomeLogs.$inferSelect;
export type InsertWeeklyIncomeLog = z.infer<typeof insertWeeklyIncomeLogSchema>;

export type AccountBalance = typeof accountBalances.$inferSelect;
export type InsertAccountBalance = z.infer<typeof insertAccountBalanceSchema>;

export type Debt = typeof debts.$inferSelect;
export type InsertDebt = z.infer<typeof insertDebtSchema>;

export type BusinessExpense = typeof businessExpenses.$inferSelect;
export type InsertBusinessExpense = z.infer<typeof insertBusinessExpenseSchema>;

export type MileageEntry = typeof mileageEntries.$inferSelect;
export type InsertMileageEntry = z.infer<typeof insertMileageEntrySchema>;

export type BusinessIncomeLog = typeof businessIncomeLogs.$inferSelect;
export type InsertBusinessIncomeLog = z.infer<typeof insertBusinessIncomeLogSchema>;

export type BusinessSettings = typeof businessSettings.$inferSelect;
export type InsertBusinessSettings = z.infer<typeof insertBusinessSettingsSchema>;

export type BillsFundingLog = typeof billsFundingLogs.$inferSelect;
export type InsertBillsFundingLog = z.infer<typeof insertBillsFundingLogSchema>;

export type InvestmentSettings = typeof investmentSettings.$inferSelect;
export type InsertInvestmentSettings = z.infer<typeof insertInvestmentSettingsSchema>;

export type Transfer = typeof transfers.$inferSelect;
export type InsertTransfer = z.infer<typeof insertTransferSchema>;

export type WeeklyCashSnapshot = typeof weeklyCashSnapshots.$inferSelect;
export type InsertWeeklyCashSnapshot = z.infer<typeof insertWeeklyCashSnapshotSchema>;

export type BillScheduleItem = typeof billSchedule.$inferSelect;
export type InsertBillScheduleItem = z.infer<typeof insertBillScheduleSchema>;
