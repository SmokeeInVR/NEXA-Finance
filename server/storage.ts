import { db } from "./db";
import {
  budgetSettings, debts, businessExpenses, mileageEntries,
  weeklyIncomeLogs, spendingLogs,
  businessIncomeLogs, businessSettings, billsFundingLogs,
  accounts, transactions, investmentSettings, transfers,
  weeklyCashSnapshots, billSchedule, campaignData,
  billsRegistry, weeklySnapshots,
  plaidConnections,
  type InsertBudgetSettings, type BudgetSettings,
  type InsertDebt, type Debt,
  type InsertBusinessExpense, type BusinessExpense,
  type InsertMileageEntry, type MileageEntry,
  type InsertWeeklyIncomeLog, type WeeklyIncomeLog,
  type InsertSpendingLog, type SpendingLog,
  type InsertBusinessIncomeLog, type BusinessIncomeLog,
  type InsertBusinessSettings, type BusinessSettings,
  type InsertBillsFundingLog, type BillsFundingLog,
  type InsertAccount, type Account,
  type InsertTransaction, type Transaction,
  type InsertInvestmentSettings, type InvestmentSettings,
  type InsertTransfer, type Transfer,
  type InsertWeeklyCashSnapshot, type WeeklyCashSnapshot,
  type InsertBillScheduleItem, type BillScheduleItem,
  type BillsRegistryItem, type WeeklySnapshot,
  type PlaidConnection, type InsertPlaidConnection,
  type CampaignData,
} from "@shared/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

// Account with computed balance
export interface AccountWithBalance extends Account {
  currentBalance: number;
}

export interface IStorage {
  // Accounts (Ledger System)
  getAccounts(): Promise<Account[]>;
  getAccountsWithBalances(): Promise<AccountWithBalance[]>;
  getAccountById(id: number): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: number, account: Partial<InsertAccount>): Promise<Account>;
  deleteAccount(id: number): Promise<void>;
  seedDefaultAccounts(): Promise<Account[]>;

  // Transactions (Core Ledger)
  getTransactions(options?: { startDate?: string; endDate?: string; type?: string; accountId?: number }): Promise<Transaction[]>;
  getTransactionsByDebtId(debtId: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  deleteTransaction(id: number): Promise<void>;
  getAccountBalance(accountId: number): Promise<number>;
  getWeeklyIncomeFromTransactions(weekStartDate: string, weekEndDate: string): Promise<{ myIncome: number; spouseIncome: number; total: number }>;

  // Budget
  getBudgetSettings(): Promise<BudgetSettings | undefined>;
  updateBudgetSettings(settings: InsertBudgetSettings): Promise<BudgetSettings>;

  // Spending
  getSpendingLogs(): Promise<SpendingLog[]>;
  createSpendingLog(log: InsertSpendingLog): Promise<SpendingLog>;
  deleteSpendingLog(id: number): Promise<void>;

  // Debts
  getDebts(): Promise<Debt[]>;
  getDebtsWithPayments(): Promise<(Debt & { totalPaid: number; remainingBalance: number })[]>;
  createDebt(debt: InsertDebt): Promise<Debt>;
  updateDebt(id: number, balance: string): Promise<Debt>;
  deleteDebt(id: number): Promise<void>;

  // Business Expenses
  getBusinessExpenses(): Promise<BusinessExpense[]>;
  createBusinessExpense(expense: InsertBusinessExpense): Promise<BusinessExpense>;
  deleteBusinessExpense(id: number): Promise<void>;

  // Mileage
  getMileageEntries(): Promise<MileageEntry[]>;
  createMileageEntry(entry: InsertMileageEntry): Promise<MileageEntry>;
  deleteMileageEntry(id: number): Promise<void>;

  // Weekly Income Log
  getWeeklyIncomeLogs(): Promise<WeeklyIncomeLog[]>;
  upsertWeeklyIncomeLog(log: InsertWeeklyIncomeLog): Promise<WeeklyIncomeLog>;
  deleteWeeklyIncomeLog(id: number): Promise<void>;

  // Business Income
  getBusinessIncomeLogs(): Promise<BusinessIncomeLog[]>;
  createBusinessIncomeLog(log: InsertBusinessIncomeLog): Promise<BusinessIncomeLog>;
  deleteBusinessIncomeLog(id: number): Promise<void>;

  // Business Settings
  getBusinessSettings(): Promise<BusinessSettings | undefined>;
  updateBusinessSettings(settings: InsertBusinessSettings): Promise<BusinessSettings>;

  // Bills Funding
  getBillsFundingLogs(): Promise<BillsFundingLog[]>;
  upsertBillsFundingLog(log: InsertBillsFundingLog): Promise<BillsFundingLog>;
  deleteBillsFundingLog(weekStartDate: string): Promise<boolean>;

  // Investment Settings (FIRE Planning)
  getInvestmentSettings(): Promise<InvestmentSettings | undefined>;
  updateInvestmentSettings(settings: InsertInvestmentSettings): Promise<InvestmentSettings>;

  // Transfers
  getTransfers(limit?: number): Promise<Transfer[]>;
  createTransfer(transfer: InsertTransfer): Promise<Transfer>;

  // Weekly Cash Snapshots
  getWeeklyCashSnapshot(weekStartDate: string): Promise<WeeklyCashSnapshot | undefined>;
  upsertWeeklyCashSnapshot(snapshot: InsertWeeklyCashSnapshot): Promise<WeeklyCashSnapshot>;
  deleteWeeklyCashSnapshot(weekStartDate: string): Promise<void>;
  computeTotalCash(includeTrading?: boolean): Promise<number>;
  markBillsPoolAsExcluded(): Promise<void>;

  // Bill Schedule
  getBillSchedule(): Promise<BillScheduleItem[]>;
  createBillScheduleItem(data: InsertBillScheduleItem): Promise<BillScheduleItem>;
  updateBillScheduleItem(id: number, data: Partial<InsertBillScheduleItem>): Promise<BillScheduleItem>;
  deleteBillScheduleItem(id: number): Promise<void>;

  // Bills Registry (Sprint 1: USDA Loan Documentation)
  getBillsRegistry(): Promise<BillsRegistryItem[]>;

  // Plaid Connections (Persistent Bank Link State)
  getPlaidConnections(): Promise<(PlaidConnection & { accounts: any[] })[]>;
  upsertPlaidConnection(connection: Omit<InsertPlaidConnection, "accountsJson"> & { accounts: any[] }): Promise<PlaidConnection & { accounts: any[] }>;
  updatePlaidAccountMetadata(itemId: string, accountId: string, metadata: { customName?: string | null; ownerTag?: string | null; ledgerAccountId?: number | null }): Promise<PlaidConnection & { accounts: any[] }>;
  deletePlaidConnection(itemId: string): Promise<void>;

  // Weekly Snapshots (Sprint 1: 24-Month USDA Trail)
  getWeeklySnapshots(): Promise<WeeklySnapshot[]>;

  // Campaign Data (Nexa OS sync)
  getCampaign(): Promise<any | null>;
  saveCampaign(data: any): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private plaidConnectionsReady = false;

  private async ensurePlaidConnectionsTable(): Promise<void> {
    if (this.plaidConnectionsReady) return;
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS plaid_connections (
        id serial PRIMARY KEY,
        item_id text NOT NULL UNIQUE,
        institution_name text NOT NULL,
        access_token text NOT NULL,
        accounts_json text NOT NULL DEFAULT '[]',
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `);
    this.plaidConnectionsReady = true;
  }

  // === ACCOUNTS ===
  
  async getAccounts(): Promise<Account[]> {
    return await db.select().from(accounts).orderBy(accounts.name);
  }

  async getAccountsWithBalances(): Promise<AccountWithBalance[]> {
    const allAccounts = await this.getAccounts();
    const accountsWithBalances: AccountWithBalance[] = [];
    for (const account of allAccounts) {
      const currentBalance = await this.getAccountBalance(account.id);
      accountsWithBalances.push({ ...account, currentBalance });
    }
    return accountsWithBalances;
  }

  async getAccountById(id: number): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account;
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const [created] = await db.insert(accounts).values(account).returning();
    return created;
  }

  async updateAccount(id: number, account: Partial<InsertAccount>): Promise<Account> {
    const [updated] = await db.update(accounts)
      .set({ ...account, updatedAt: new Date() })
      .where(eq(accounts.id, id))
      .returning();
    return updated;
  }

  async deleteAccount(id: number): Promise<void> {
    await db.delete(accounts).where(eq(accounts.id, id));
  }

  async seedDefaultAccounts(): Promise<Account[]> {
    const existing = await this.getAccounts();
    if (existing.length > 0) return existing;
    const defaultAccounts: InsertAccount[] = [
      { name: "Personal Checking (Me)", type: "personal", startingBalance: "0" },
      { name: "Spouse Checking", type: "spouse", startingBalance: "0" },
      { name: "Joint Checking", type: "joint", startingBalance: "0" },
      { name: "Savings", type: "joint", startingBalance: "0" },
      { name: "Bills Pool", type: "bucket", startingBalance: "0", excludeFromTotals: true },
      { name: "Emergency Buffer", type: "bucket", startingBalance: "0" },
      { name: "Trading Funds", type: "bucket", startingBalance: "0" },
      { name: "Business Checking", type: "business", startingBalance: "0" },
      { name: "Tax Set-Aside", type: "bucket", startingBalance: "0" },
    ];
    const created = await db.insert(accounts).values(defaultAccounts).returning();
    return created;
  }

  // === TRANSACTIONS ===

  async getTransactions(options?: { startDate?: string; endDate?: string; type?: string; accountId?: number }): Promise<Transaction[]> {
    let query = db.select().from(transactions);
    const conditions = [];
    if (options?.startDate) conditions.push(gte(transactions.date, options.startDate));
    if (options?.endDate) conditions.push(lte(transactions.date, options.endDate));
    if (options?.type) conditions.push(eq(transactions.type, options.type));
    if (options?.accountId) {
      conditions.push(
        sql`(${transactions.fromAccountId} = ${options.accountId} OR ${transactions.toAccountId} = ${options.accountId})`
      );
    }
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    return await query.orderBy(desc(transactions.date));
  }

  async getTransactionsByDebtId(debtId: number): Promise<Transaction[]> {
    return await db.select().from(transactions)
      .where(eq(transactions.debtId, debtId))
      .orderBy(desc(transactions.date));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [created] = await db.insert(transactions).values({
      ...transaction,
      amount: String(transaction.amount)
    }).returning();
    return created;
  }

  async deleteTransaction(id: number): Promise<void> {
    await db.delete(transactions).where(eq(transactions.id, id));
  }

  async getAccountBalance(accountId: number): Promise<number> {
    const account = await this.getAccountById(accountId);
    if (!account) return 0;
    const startingBalance = parseFloat(account.startingBalance || "0");
    const [incoming] = await db.select({
      total: sql<string>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0)`
    }).from(transactions).where(eq(transactions.toAccountId, accountId));
    const [outgoing] = await db.select({
      total: sql<string>`COALESCE(SUM(CAST(${transactions.amount} AS DECIMAL)), 0)`
    }).from(transactions).where(eq(transactions.fromAccountId, accountId));
    return startingBalance + parseFloat(incoming?.total || "0") - parseFloat(outgoing?.total || "0");
  }

  async getWeeklyIncomeFromTransactions(weekStartDate: string, weekEndDate: string): Promise<{ myIncome: number; spouseIncome: number; total: number }> {
    const incomeTransactions = await db.select().from(transactions)
      .where(and(
        eq(transactions.type, "income"),
        gte(transactions.date, weekStartDate),
        lte(transactions.date, weekEndDate)
      ));
    let myIncome = 0;
    let spouseIncome = 0;
    for (const tx of incomeTransactions) {
      const amount = parseFloat(tx.amount);
      if (tx.createdBy === "Me") myIncome += amount;
      else if (tx.createdBy === "Spouse") spouseIncome += amount;
    }
    return { myIncome, spouseIncome, total: myIncome + spouseIncome };
  }

  // === DEBTS ===

  async getDebtsWithPayments(): Promise<(Debt & { totalPaid: number; remainingBalance: number })[]> {
    const allDebts = await this.getDebts();
    const debtsWithPayments = [];
    for (const debt of allDebts) {
      const payments = await this.getTransactionsByDebtId(debt.id);
      const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const startingBalance = parseFloat(debt.startingBalance || debt.balance);
      const remainingBalance = startingBalance - totalPaid;
      debtsWithPayments.push({ ...debt, totalPaid, remainingBalance: Math.max(0, remainingBalance) });
    }
    return debtsWithPayments;
  }

  // === BUDGET SETTINGS ===

  async getBudgetSettings(): Promise<BudgetSettings | undefined> {
    await db.execute(sql`ALTER TABLE budget_settings ADD COLUMN IF NOT EXISTS my_allowance numeric NOT NULL DEFAULT 0`);
    await db.execute(sql`ALTER TABLE budget_settings ADD COLUMN IF NOT EXISTS spouse_allowance numeric NOT NULL DEFAULT 0`);
    await db.execute(sql`ALTER TABLE budget_settings ADD COLUMN IF NOT EXISTS allowance_configured boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE budget_settings ADD COLUMN IF NOT EXISTS personal_flex_percent numeric NOT NULL DEFAULT 10`);
    await db.execute(sql`ALTER TABLE budget_settings ADD COLUMN IF NOT EXISTS personal_flex_me_split_pct numeric NOT NULL DEFAULT 50`);
    await db.execute(sql`ALTER TABLE budget_settings ADD COLUMN IF NOT EXISTS grocery_budget_override numeric`);
    await db.execute(sql`ALTER TABLE budget_settings ADD COLUMN IF NOT EXISTS fuel_budget_override numeric`);
    const [settings] = await db.select().from(budgetSettings).limit(1);
    return settings;
  }

  async updateBudgetSettings(settings: InsertBudgetSettings): Promise<BudgetSettings> {
    const existing = await this.getBudgetSettings();
    if (existing) {
      const [updated] = await db.update(budgetSettings).set({ 
        ...settings,
        myAllowance: String(settings.myAllowance ?? existing.myAllowance),
        spouseAllowance: String(settings.spouseAllowance ?? existing.spouseAllowance),
        personalFlexPercent: String(settings.personalFlexPercent ?? existing.personalFlexPercent),
        personalFlexMeSplitPct: String(settings.personalFlexMeSplitPct ?? existing.personalFlexMeSplitPct),
        groceryBudgetOverride: settings.groceryBudgetOverride == null ? null : String(settings.groceryBudgetOverride),
        fuelBudgetOverride: settings.fuelBudgetOverride == null ? null : String(settings.fuelBudgetOverride),
        splitMode: settings.splitMode || existing.splitMode,
        mySplitPct: settings.mySplitPct || existing.mySplitPct,
        spouseSplitPct: settings.spouseSplitPct || existing.spouseSplitPct,
        savingsMode: settings.savingsMode || existing.savingsMode,
        savingsValue: settings.savingsValue || existing.savingsValue,
        investingMode: settings.investingMode || existing.investingMode,
        investingValue: settings.investingValue || existing.investingValue,
        debtBufferMode: settings.debtBufferMode || existing.debtBufferMode,
        debtBufferValue: settings.debtBufferValue || existing.debtBufferValue,
        tradingMode: settings.tradingMode || existing.tradingMode,
        tradingValue: settings.tradingValue || existing.tradingValue,
        allocationFrequency: settings.allocationFrequency || existing.allocationFrequency,
        incomeSource: settings.incomeSource || existing.incomeSource,
        avgWindowWeeks: settings.avgWindowWeeks ?? existing.avgWindowWeeks,
        bufferGoalAmount: String(settings.bufferGoalAmount) || existing.bufferGoalAmount,
        bufferRerouteEnabled: settings.bufferRerouteEnabled ?? existing.bufferRerouteEnabled,
        rerouteTarget: settings.rerouteTarget || existing.rerouteTarget,
        updatedAt: new Date()
      } as any).where(eq(budgetSettings.id, existing.id)).returning();
      return updated;
    } else {
      const [created] = await db.insert(budgetSettings).values({
        ...settings,
        bufferGoalAmount: String(settings.bufferGoalAmount),
        myAllowance: String(settings.myAllowance ?? 0),
        spouseAllowance: String(settings.spouseAllowance ?? 0),
        personalFlexPercent: String(settings.personalFlexPercent ?? 10),
        personalFlexMeSplitPct: String(settings.personalFlexMeSplitPct ?? 50),
        groceryBudgetOverride: settings.groceryBudgetOverride == null ? null : String(settings.groceryBudgetOverride),
        fuelBudgetOverride: settings.fuelBudgetOverride == null ? null : String(settings.fuelBudgetOverride)
      } as any).returning();
      return created;
    }
  }

  async getSpendingLogs(): Promise<SpendingLog[]> {
    return await db.select().from(spendingLogs).orderBy(desc(spendingLogs.date));
  }

  async createSpendingLog(log: InsertSpendingLog): Promise<SpendingLog> {
    const [created] = await db.insert(spendingLogs).values(log).returning();
    return created;
  }

  async deleteSpendingLog(id: number): Promise<void> {
    await db.delete(spendingLogs).where(eq(spendingLogs.id, id));
  }

  async getDebts(): Promise<Debt[]> {
    const allDebts = await db.select().from(debts).orderBy(desc(debts.createdAt));
    for (const debt of allDebts) {
      if (debt.startingBalance === null) {
        await db.update(debts).set({ startingBalance: debt.balance }).where(eq(debts.id, debt.id));
        debt.startingBalance = debt.balance;
      }
    }
    return allDebts;
  }

  async createDebt(debt: InsertDebt): Promise<Debt> {
    const [created] = await db.insert(debts).values({ ...debt, startingBalance: debt.balance }).returning();
    return created;
  }

  async updateDebt(id: number, balance: string): Promise<Debt> {
    const [updated] = await db.update(debts).set({ balance }).where(eq(debts.id, id)).returning();
    return updated;
  }

  async deleteDebt(id: number): Promise<void> {
    await db.delete(debts).where(eq(debts.id, id));
  }

  async getBusinessExpenses(): Promise<BusinessExpense[]> {
    return await db.select().from(businessExpenses).orderBy(desc(businessExpenses.date));
  }

  async createBusinessExpense(expense: InsertBusinessExpense): Promise<BusinessExpense> {
    const [created] = await db.insert(businessExpenses).values(expense).returning();
    return created;
  }

  async deleteBusinessExpense(id: number): Promise<void> {
    await db.delete(businessExpenses).where(eq(businessExpenses.id, id));
  }

  async getMileageEntries(): Promise<MileageEntry[]> {
    return await db.select().from(mileageEntries).orderBy(desc(mileageEntries.date));
  }

  async createMileageEntry(entry: InsertMileageEntry): Promise<MileageEntry> {
    const [created] = await db.insert(mileageEntries).values(entry).returning();
    return created;
  }

  async deleteMileageEntry(id: number): Promise<void> {
    await db.delete(mileageEntries).where(eq(mileageEntries.id, id));
  }

  async getWeeklyIncomeLogs(): Promise<WeeklyIncomeLog[]> {
    return await db.select().from(weeklyIncomeLogs).orderBy(desc(weeklyIncomeLogs.weekStartDate));
  }

  async upsertWeeklyIncomeLog(log: InsertWeeklyIncomeLog): Promise<WeeklyIncomeLog> {
    console.log("Storage upserting log for week:", log.weekStartDate);
    try {
      const [existing] = await db.select().from(weeklyIncomeLogs).where(eq(weeklyIncomeLogs.weekStartDate, log.weekStartDate));
      if (existing) {
        console.log("Updating existing log id:", existing.id);
        const [updated] = await db.update(weeklyIncomeLogs).set({
          myIncome: log.myIncome,
          spouseIncome: log.spouseIncome,
          notes: log.notes,
          createdAt: new Date()
        }).where(eq(weeklyIncomeLogs.id, existing.id)).returning();
        return updated;
      }
      console.log("Inserting new log");
      const [created] = await db.insert(weeklyIncomeLogs).values(log).returning();
      return created;
    } catch (dbErr) {
      console.error("Database error in upsertWeeklyIncomeLog:", dbErr);
      throw dbErr;
    }
  }

  async deleteWeeklyIncomeLog(id: number): Promise<void> {
    await db.delete(weeklyIncomeLogs).where(eq(weeklyIncomeLogs.id, id));
  }

  async getBusinessIncomeLogs(): Promise<BusinessIncomeLog[]> {
    return await db.select().from(businessIncomeLogs).orderBy(desc(businessIncomeLogs.date));
  }

  async createBusinessIncomeLog(log: InsertBusinessIncomeLog): Promise<BusinessIncomeLog> {
    const [created] = await db.insert(businessIncomeLogs).values(log).returning();
    return created;
  }

  async deleteBusinessIncomeLog(id: number): Promise<void> {
    await db.delete(businessIncomeLogs).where(eq(businessIncomeLogs.id, id));
  }

  async getBusinessSettings(): Promise<BusinessSettings | undefined> {
    const [settings] = await db.select().from(businessSettings).limit(1);
    return settings;
  }

  async updateBusinessSettings(settings: InsertBusinessSettings): Promise<BusinessSettings> {
    const existing = await this.getBusinessSettings();
    if (existing) {
      const [updated] = await db.update(businessSettings)
        .set({ taxHoldPercent: settings.taxHoldPercent, updatedAt: new Date() })
        .where(eq(businessSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(businessSettings).values(settings).returning();
      return created;
    }
  }

  async getBillsFundingLogs(): Promise<BillsFundingLog[]> {
    return await db.select().from(billsFundingLogs).orderBy(desc(billsFundingLogs.weekStartDate));
  }

  async upsertBillsFundingLog(log: InsertBillsFundingLog): Promise<BillsFundingLog> {
    const [existing] = await db.select().from(billsFundingLogs).where(eq(billsFundingLogs.weekStartDate, log.weekStartDate));
    if (existing) {
      const [updated] = await db.update(billsFundingLogs).set({
        myTransfer: log.myTransfer,
        spouseTransfer: log.spouseTransfer,
        note: log.note,
        updatedAt: new Date()
      }).where(eq(billsFundingLogs.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(billsFundingLogs).values(log).returning();
    return created;
  }

  async deleteBillsFundingLog(weekStartDate: string): Promise<boolean> {
    await db.delete(billsFundingLogs).where(eq(billsFundingLogs.weekStartDate, weekStartDate));
    return true;
  }

  // === INVESTMENT SETTINGS ===

  async getInvestmentSettings(): Promise<InvestmentSettings | undefined> {
    const [settings] = await db.select().from(investmentSettings).limit(1);
    return settings;
  }

  async updateInvestmentSettings(settings: InsertInvestmentSettings): Promise<InvestmentSettings> {
    const existing = await this.getInvestmentSettings();
    if (existing) {
      const [updated] = await db.update(investmentSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(investmentSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(investmentSettings).values(settings).returning();
      return created;
    }
  }

  // === TRANSFERS ===

  async getTransfers(limit: number = 10): Promise<Transfer[]> {
    return await db.select().from(transfers).orderBy(desc(transfers.createdAt)).limit(limit);
  }

  async createTransfer(transfer: InsertTransfer): Promise<Transfer> {
    const fromAccount = await this.getAccountById(transfer.fromAccountId);
    const toAccount = await this.getAccountById(transfer.toAccountId);
    if (!fromAccount || !toAccount) throw new Error("Invalid account IDs");
    if (transfer.fromAccountId === transfer.toAccountId) throw new Error("From and To accounts must be different");
    const amount = parseFloat(String(transfer.amount));
    if (amount <= 0) throw new Error("Amount must be greater than zero");

    return await db.transaction(async (tx) => {
      const fromNewBalance = parseFloat(fromAccount.startingBalance || "0") - amount;
      const toNewBalance = parseFloat(toAccount.startingBalance || "0") + amount;
      await tx.update(accounts).set({ startingBalance: String(fromNewBalance), updatedAt: new Date() }).where(eq(accounts.id, transfer.fromAccountId));
      await tx.update(accounts).set({ startingBalance: String(toNewBalance), updatedAt: new Date() }).where(eq(accounts.id, transfer.toAccountId));
      const [created] = await tx.insert(transfers).values({
        date: transfer.date,
        fromAccountId: transfer.fromAccountId,
        toAccountId: transfer.toAccountId,
        amount: String(transfer.amount),
        note: transfer.note || null,
        createdBy: transfer.createdBy || "Me"
      }).returning();
      return created;
    });
  }

  // === WEEKLY CASH SNAPSHOTS ===

  async getWeeklyCashSnapshot(weekStartDate: string): Promise<WeeklyCashSnapshot | undefined> {
    const [snapshot] = await db.select().from(weeklyCashSnapshots).where(eq(weeklyCashSnapshots.weekStartDate, weekStartDate));
    return snapshot;
  }

  async upsertWeeklyCashSnapshot(snapshot: InsertWeeklyCashSnapshot): Promise<WeeklyCashSnapshot> {
    const existing = await this.getWeeklyCashSnapshot(snapshot.weekStartDate);
    if (existing) {
      const [updated] = await db.update(weeklyCashSnapshots)
        .set({ startingCash: snapshot.startingCash, includeTrading: snapshot.includeTrading ?? false, updatedAt: new Date() })
        .where(eq(weeklyCashSnapshots.weekStartDate, snapshot.weekStartDate))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(weeklyCashSnapshots).values(snapshot).returning();
      return created;
    }
  }

  async deleteWeeklyCashSnapshot(weekStartDate: string): Promise<void> {
    await db.delete(weeklyCashSnapshots).where(eq(weeklyCashSnapshots.weekStartDate, weekStartDate));
  }

  async computeTotalCash(includeTrading: boolean = false): Promise<number> {
    const accountsWithBalances = await this.getAccountsWithBalances();
    let total = 0;
    for (const account of accountsWithBalances) {
      if (account.type === "business") continue;
      if (account.excludeFromTotals) continue;
      if (!includeTrading && account.name.toLowerCase().includes("trading")) continue;
      total += account.currentBalance;
    }
    return total;
  }

  async markBillsPoolAsExcluded(): Promise<void> {
    await db.update(accounts).set({ excludeFromTotals: true }).where(eq(accounts.name, "Bills Pool"));
  }

  // === BILL SCHEDULE ===

  async getBillSchedule(): Promise<BillScheduleItem[]> {
    await this.ensureBillScheduleColumns();
    return await db.select().from(billSchedule).orderBy(billSchedule.dueDay);
  }

  private async ensureBillScheduleColumns(): Promise<void> {
    await db.execute(sql`ALTER TABLE bill_schedule ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD'`);
    await db.execute(sql`ALTER TABLE bill_schedule ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'monthly'`);
    await db.execute(sql`ALTER TABLE bill_schedule ADD COLUMN IF NOT EXISTS end_of_month boolean NOT NULL DEFAULT true`);
    await db.execute(sql`ALTER TABLE bill_schedule ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true`);
    await db.execute(sql`ALTER TABLE bill_schedule ADD COLUMN IF NOT EXISTS start_date date`);
    await db.execute(sql`ALTER TABLE bill_schedule ADD COLUMN IF NOT EXISTS end_date date`);
    await db.execute(sql`ALTER TABLE bill_schedule ADD COLUMN IF NOT EXISTS importance text NOT NULL DEFAULT 'important'`);
    await db.execute(sql`ALTER TABLE bill_schedule ADD COLUMN IF NOT EXISTS source_account text`);
    await db.execute(sql`ALTER TABLE bill_schedule ADD COLUMN IF NOT EXISTS merchant_pattern text`);
  }

  async createBillScheduleItem(data: InsertBillScheduleItem): Promise<BillScheduleItem> {
    await this.ensureBillScheduleColumns();
    const [item] = await db.insert(billSchedule).values({ ...data, amount: String(data.amount) }).returning();
    return item;
  }

  async updateBillScheduleItem(id: number, data: Partial<InsertBillScheduleItem>): Promise<BillScheduleItem> {
    await this.ensureBillScheduleColumns();
    const updateData: Partial<BillScheduleItem> = {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.amount !== undefined ? { amount: String(data.amount) } : {}),
      ...(data.dueDay !== undefined ? { dueDay: data.dueDay } : {}),
      ...(data.currency !== undefined ? { currency: data.currency } : {}),
      ...(data.frequency !== undefined ? { frequency: data.frequency } : {}),
      ...(data.endOfMonth !== undefined ? { endOfMonth: data.endOfMonth } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
      ...(data.startDate !== undefined ? { startDate: data.startDate } : {}),
      ...(data.endDate !== undefined ? { endDate: data.endDate } : {}),
      ...(data.importance !== undefined ? { importance: data.importance } : {}),
      ...(data.sourceAccount !== undefined ? { sourceAccount: data.sourceAccount } : {}),
      ...(data.merchantPattern !== undefined ? { merchantPattern: data.merchantPattern } : {}),
      ...(data.isVariable !== undefined ? { isVariable: data.isVariable } : {}),
      ...(data.autopay !== undefined ? { autopay: data.autopay } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    };

    const [item] = await db.update(billSchedule)
      .set(updateData)
      .where(eq(billSchedule.id, id))
      .returning();
    return item;
  }

  async deleteBillScheduleItem(id: number): Promise<void> {
    await db.delete(billSchedule).where(eq(billSchedule.id, id));
  }

  // === PLAID CONNECTIONS (Persistent Bank Link State) ===

  async getPlaidConnections(): Promise<(PlaidConnection & { accounts: any[] })[]> {
    try {
      await this.ensurePlaidConnectionsTable();
      const rows = await db.select().from(plaidConnections).orderBy(desc(plaidConnections.updatedAt));
      return rows.map((row) => ({
        ...row,
        accounts: (() => {
          try {
            return JSON.parse(row.accountsJson || "[]");
          } catch {
            return [];
          }
        })(),
      }));
    } catch (err) {
      console.error("Get plaid connections error:", err);
      return [];
    }
  }

  async upsertPlaidConnection(connection: Omit<InsertPlaidConnection, "accountsJson"> & { accounts: any[] }): Promise<PlaidConnection & { accounts: any[] }> {
    await this.ensurePlaidConnectionsTable();
    const payload = {
      itemId: connection.itemId,
      institutionName: connection.institutionName,
      accessToken: connection.accessToken,
      accountsJson: JSON.stringify(connection.accounts ?? []),
      updatedAt: new Date(),
    };

    const existing = await db.select().from(plaidConnections).where(eq(plaidConnections.itemId, connection.itemId));
    const [row] = existing.length > 0
      ? await db.update(plaidConnections)
          .set(payload)
          .where(eq(plaidConnections.itemId, connection.itemId))
          .returning()
      : await db.insert(plaidConnections)
          .values({ ...payload, createdAt: new Date() })
          .returning();

    return {
      ...row,
      accounts: connection.accounts ?? [],
    };
  }

  async updatePlaidAccountMetadata(
    itemId: string,
    accountId: string,
    metadata: { customName?: string | null; ownerTag?: string | null; ledgerAccountId?: number | null },
  ): Promise<PlaidConnection & { accounts: any[] }> {
    await this.ensurePlaidConnectionsTable();
    const [existing] = await db.select().from(plaidConnections).where(eq(plaidConnections.itemId, itemId));
    if (!existing) {
      throw new Error("Plaid connection not found");
    }

    const accounts = (() => {
      try {
        return JSON.parse(existing.accountsJson || "[]");
      } catch {
        return [];
      }
    })();

    const updatedAccounts = accounts.map((account: any) =>
      account.accountId === accountId
        ? {
            ...account,
            customName: metadata.customName?.trim() || null,
            ownerTag: metadata.ownerTag?.trim() || null,
            ledgerAccountId:
              metadata.ledgerAccountId == null || Number.isNaN(Number(metadata.ledgerAccountId))
                ? null
                : Number(metadata.ledgerAccountId),
          }
        : account,
    );

    const [row] = await db
      .update(plaidConnections)
      .set({
        accountsJson: JSON.stringify(updatedAccounts),
        updatedAt: new Date(),
      })
      .where(eq(plaidConnections.itemId, itemId))
      .returning();

    return {
      ...row,
      accounts: updatedAccounts,
    };
  }

  async deletePlaidConnection(itemId: string): Promise<void> {
    await this.ensurePlaidConnectionsTable();
    await db.delete(plaidConnections).where(eq(plaidConnections.itemId, itemId));
  }

  // === BILLS REGISTRY (Sprint 1: USDA Loan Documentation) ===

  async getBillsRegistry(): Promise<BillsRegistryItem[]> {
    try {
      return await db.select().from(billsRegistry).orderBy(billsRegistry.dueDay);
    } catch (err) {
      console.error("Get bills registry error:", err);
      return [];
    }
  }

  // === WEEKLY SNAPSHOTS (Sprint 1: 24-Month USDA Trail) ===

  async getWeeklySnapshots(): Promise<WeeklySnapshot[]> {
    try {
      return await db.select().from(weeklySnapshots).orderBy(desc(weeklySnapshots.weekStartDate));
    } catch (err) {
      console.error("Get weekly snapshots error:", err);
      return [];
    }
  }

  // === CAMPAIGN DATA ===

  async getCampaign(): Promise<any | null> {
    try {
      const [row] = await db.select().from(campaignData).where(eq(campaignData.key, "main"));
      return row ? JSON.parse(row.value) : null;
    } catch {
      return null;
    }
  }

  async saveCampaign(data: any): Promise<void> {
    const value = JSON.stringify(data);
    const existing = await db.select().from(campaignData).where(eq(campaignData.key, "main"));
    if (existing.length > 0) {
      await db.update(campaignData).set({ value, updatedAt: new Date() }).where(eq(campaignData.key, "main"));
    } else {
      await db.insert(campaignData).values({ key: "main", value });
    }
  }
}

export const storage = new DatabaseStorage();
