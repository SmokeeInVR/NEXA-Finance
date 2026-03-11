import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { Parser } from "json2csv";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Run migrations on startup
  await storage.markBillsPoolAsExcluded();
  
  // === ACCOUNTS (LEDGER SYSTEM) ===
  app.get(api.accounts.list.path, async (_req, res) => {
    const accountsList = await storage.getAccounts();
    res.json(accountsList);
  });

  app.get(api.accounts.listWithBalances.path, async (_req, res) => {
    const accountsWithBalances = await storage.getAccountsWithBalances();
    res.json(accountsWithBalances);
  });

  app.post(api.accounts.create.path, async (req, res) => {
    try {
      const input = api.accounts.create.input.parse(req.body);
      const account = await storage.createAccount(input);
      res.status(201).json(account);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: err.errors });
        return;
      }
      console.error("Create account error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.accounts.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.accounts.update.input.parse(req.body);
      const account = await storage.updateAccount(id, input);
      res.json(account);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: err.errors });
        return;
      }
      console.error("Update account error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.accounts.delete.path, async (req, res) => {
    await storage.deleteAccount(Number(req.params.id));
    res.sendStatus(204);
  });

  app.post(api.accounts.seed.path, async (_req, res) => {
    const accountsList = await storage.seedDefaultAccounts();
    // Migration: Ensure Bills Pool is excluded from totals
    await storage.markBillsPoolAsExcluded();
    res.json(accountsList);
  });

  // === TRANSACTIONS (CORE LEDGER) ===
  app.get(api.transactions.list.path, async (req, res) => {
    const options: { startDate?: string; endDate?: string; type?: string; accountId?: number } = {};
    if (req.query.startDate) options.startDate = String(req.query.startDate);
    if (req.query.endDate) options.endDate = String(req.query.endDate);
    if (req.query.type) options.type = String(req.query.type);
    if (req.query.accountId) options.accountId = Number(req.query.accountId);
    
    const txList = await storage.getTransactions(options);
    res.json(txList);
  });

  app.post(api.transactions.create.path, async (req, res) => {
    try {
      const input = api.transactions.create.input.parse(req.body);
      const transaction = await storage.createTransaction(input);
      res.status(201).json(transaction);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: err.errors });
        return;
      }
      console.error("Create transaction error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.transactions.delete.path, async (req, res) => {
    await storage.deleteTransaction(Number(req.params.id));
    res.sendStatus(204);
  });

  // === DEBTS WITH PAYMENTS ===
  app.get("/api/debts/with-payments", async (_req, res) => {
    const debtsWithPayments = await storage.getDebtsWithPayments();
    res.json(debtsWithPayments);
  });

  // === Budget ===
  app.get(api.budget.get.path, async (_req, res) => {
    const settings = await storage.getBudgetSettings();
    const defaultSettings = {
      id: 0,
      monthlyFixedBills: "0",
      splitMode: "AUTO",
      mySplitPct: "50",
      spouseSplitPct: "50",
      savingsMode: "PERCENT",
      savingsValue: "0",
      investingMode: "PERCENT",
      investingValue: "0",
      debtBufferMode: "PERCENT",
      debtBufferValue: "0",
      tradingMode: "PERCENT",
      tradingValue: "0",
      allocationFrequency: "MONTHLY",
      incomeSource: "MANUAL",
      avgWindowWeeks: 4,
      bufferGoalAmount: "1000",
      bufferRerouteEnabled: false,
      rerouteTarget: "SAVINGS",
      updatedAt: new Date()
    };
    res.json(settings || defaultSettings);
  });

  app.post(api.budget.update.path, async (req, res) => {
    try {
      const input = api.budget.update.input.parse(req.body);
      const settings = await storage.updateBudgetSettings(input);
      res.json(settings);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: err.errors });
        return;
      }
      console.error("Update budget error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // === Spending ===
  app.get(api.spending.list.path, async (_req, res) => {
    const logs = await storage.getSpendingLogs();
    res.json(logs);
  });

  app.post(api.spending.create.path, async (req, res) => {
    try {
      const input = api.spending.create.input.parse(req.body);
      const log = await storage.createSpendingLog(input);
      res.status(201).json(log);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input" });
        return;
      }
      throw err;
    }
  });

  app.delete(api.spending.delete.path, async (req, res) => {
    await storage.deleteSpendingLog(Number(req.params.id));
    res.sendStatus(204);
  });

  // === Debts ===
  app.get(api.debts.list.path, async (_req, res) => {
    const debts = await storage.getDebts();
    res.json(debts);
  });

  app.post(api.debts.create.path, async (req, res) => {
    try {
      const input = api.debts.create.input.parse(req.body);
      const debt = await storage.createDebt(input);
      res.status(201).json(debt);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input" });
        return;
      }
      throw err;
    }
  });

  app.patch(api.debts.update.path, async (req, res) => {
    try {
      const input = api.debts.update.input.parse(req.body);
      const updated = await storage.updateDebt(Number(req.params.id), input.balance);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input" });
        return;
      }
      throw err;
    }
  });

  app.delete(api.debts.delete.path, async (req, res) => {
    await storage.deleteDebt(Number(req.params.id));
    res.sendStatus(204);
  });

  // === Business Expenses ===
  app.get(api.business.expenses.list.path, async (_req, res) => {
    const expenses = await storage.getBusinessExpenses();
    res.json(expenses);
  });

  app.post(api.business.expenses.create.path, async (req, res) => {
    try {
      const input = api.business.expenses.create.input.parse(req.body);
      const expense = await storage.createBusinessExpense(input);
      res.status(201).json(expense);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input" });
        return;
      }
      throw err;
    }
  });

  app.delete(api.business.expenses.delete.path, async (req, res) => {
    await storage.deleteBusinessExpense(Number(req.params.id));
    res.sendStatus(204);
  });

  // === Mileage ===
  app.get(api.business.mileage.list.path, async (_req, res) => {
    const entries = await storage.getMileageEntries();
    res.json(entries);
  });

  app.post(api.business.mileage.create.path, async (req, res) => {
    try {
      const input = api.business.mileage.create.input.parse(req.body);
      const entry = await storage.createMileageEntry(input);
      res.status(201).json(entry);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input" });
        return;
      }
      throw err;
    }
  });

  app.delete(api.business.mileage.delete.path, async (req, res) => {
    await storage.deleteMileageEntry(Number(req.params.id));
    res.sendStatus(204);
  });

  // === Business Income ===
  app.get(api.business.income.list.path, async (_req, res) => {
    const income = await storage.getBusinessIncomeLogs();
    res.json(income);
  });

  app.post(api.business.income.create.path, async (req, res) => {
    try {
      const input = api.business.income.create.input.parse(req.body);
      const log = await storage.createBusinessIncomeLog(input);
      res.status(201).json(log);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input" });
        return;
      }
      throw err;
    }
  });

  app.delete(api.business.income.delete.path, async (req, res) => {
    await storage.deleteBusinessIncomeLog(Number(req.params.id));
    res.sendStatus(204);
  });

  // === Business Settings ===
  app.get(api.business.settings.get.path, async (_req, res) => {
    const settings = await storage.getBusinessSettings();
    res.json(settings || { taxHoldPercent: "25" });
  });

  app.post(api.business.settings.update.path, async (req, res) => {
    try {
      const input = api.business.settings.update.input.parse(req.body);
      const settings = await storage.updateBusinessSettings(input);
      res.json(settings);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input" });
        return;
      }
      throw err;
    }
  });

  // === Income Log ===
  app.get(api.income.list.path, async (_req, res) => {
    const logs = await storage.getWeeklyIncomeLogs();
    res.json(logs);
  });

  app.post(api.income.create.path, async (req, res) => {
    try {
      console.log("POST /api/income - Body:", req.body);
      const input = api.income.create.input.parse(req.body);
      console.log("POST /api/income - Parsed input:", input);
      
      // Check if entry already exists for this week (to prevent double-deposit)
      const existingLogs = await storage.getWeeklyIncomeLogs();
      const existingLog = existingLogs.find(log => log.weekStartDate === input.weekStartDate);
      
      // If editing an existing entry that was already deposited, don't deposit again
      const shouldDeposit = input.deposited && !existingLog?.deposited;
      
      // Save the income log
      const log = await storage.upsertWeeklyIncomeLog(input);
      console.log("POST /api/income - Upsert result:", log);
      
      // Handle deposits if enabled and not already deposited for this week
      if (shouldDeposit) {
        const myAmount = parseFloat(String(input.myIncome || 0));
        const spouseAmount = parseFloat(String(input.spouseIncome || 0));
        
        // Deposit my income to selected account
        if (myAmount > 0 && input.myDepositAccountId) {
          const myAccount = await storage.getAccountById(input.myDepositAccountId);
          if (myAccount) {
            const newBalance = parseFloat(myAccount.startingBalance || "0") + myAmount;
            await storage.updateAccount(input.myDepositAccountId, { 
              startingBalance: String(newBalance) 
            });
            console.log(`Deposited $${myAmount} to account ${myAccount.name}`);
          }
        }
        
        // Deposit spouse income to selected account
        if (spouseAmount > 0 && input.spouseDepositAccountId) {
          const spouseAccount = await storage.getAccountById(input.spouseDepositAccountId);
          if (spouseAccount) {
            const newBalance = parseFloat(spouseAccount.startingBalance || "0") + spouseAmount;
            await storage.updateAccount(input.spouseDepositAccountId, { 
              startingBalance: String(newBalance) 
            });
            console.log(`Deposited $${spouseAmount} to account ${spouseAccount.name}`);
          }
        }
      }
      
      res.status(201).json(log);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        console.error("Zod error for income:", err.errors);
        res.status(400).json({ message: "Invalid input", errors: err.errors });
        return;
      }
      console.error("Income log error:", err);
      res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  app.delete(api.income.delete.path, async (req, res) => {
    await storage.deleteWeeklyIncomeLog(Number(req.params.id));
    res.sendStatus(204);
  });

  app.get("/api/income/latest", async (req, res) => {
    const logs = await storage.getWeeklyIncomeLogs();
    
    // Determine current week start (Monday)
    const now = new Date();
    const day = now.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() + diff);
    const currentWeekStart = monday.toISOString().split("T")[0];
    
    // Only return income for the current week
    const currentWeekLog = logs.find(l => l.weekStartDate === currentWeekStart);
    
    if (currentWeekLog) {
      const myIncome = parseFloat(String(currentWeekLog.myIncome));
      const spouseIncome = parseFloat(String(currentWeekLog.spouseIncome));
      res.json({
        weekStartDate: currentWeekLog.weekStartDate,
        myIncome,
        spouseIncome,
        totalWeeklyIncome: myIncome + spouseIncome,
        updatedAt: currentWeekLog.createdAt
      });
    } else {
      // No income logged for this week - carry forward most recent week
      const mostRecent = logs[0]; // already ordered by desc date
      if (mostRecent) {
        const myIncome = parseFloat(String(mostRecent.myIncome));
        const spouseIncome = parseFloat(String(mostRecent.spouseIncome));
        res.json({
          weekStartDate: currentWeekStart,
          myIncome,
          spouseIncome,
          totalWeeklyIncome: myIncome + spouseIncome,
          updatedAt: mostRecent.createdAt,
          carriedForward: true
        });
      } else {
        res.json({
          weekStartDate: currentWeekStart,
          myIncome: 0,
          spouseIncome: 0,
          totalWeeklyIncome: 0,
          updatedAt: null
        });
      }
    }
  });

  // === Balances ===
  app.get(api.balances.list.path, async (_req, res) => {
    const balances = await storage.getAccountBalances();
    res.json(balances);
  });

  app.post(api.balances.update.path, async (req, res) => {
    try {
      const input = api.balances.update.input.parse(req.body);
      const balances = await storage.updateAccountBalances(input);
      res.json(balances);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input" });
        return;
      }
      throw err;
    }
  });

  // === Bills Funding ===
  app.get(api.billsFunding.list.path, async (_req, res) => {
    const logs = await storage.getBillsFundingLogs();
    res.json(logs);
  });

  app.post(api.billsFunding.upsert.path, async (req, res) => {
    try {
      const input = api.billsFunding.upsert.input.parse(req.body);
      
      const myAmount = parseFloat(input.myTransfer || "0");
      const spouseAmount = parseFloat(input.spouseTransfer || "0");
      const totalFunding = myAmount + spouseAmount;
      
      // Get existing log to calculate deltas
      const existingLogs = await storage.getBillsFundingLogs();
      const existingLog = existingLogs.find(l => l.weekStartDate === input.weekStartDate);
      const previousMy = existingLog ? parseFloat(existingLog.myTransfer || "0") : 0;
      const previousSpouse = existingLog ? parseFloat(existingLog.spouseTransfer || "0") : 0;
      const previousTotal = previousMy + previousSpouse;
      const fundingDelta = totalFunding - previousTotal;
      const myDelta = myAmount - previousMy;
      const spouseDelta = spouseAmount - previousSpouse;
      
      // Save the log entry
      const log = await storage.upsertBillsFundingLog(input);
      
      // Move money between accounts using delta-based transfers
      // Delta approach: only transfer the difference when updating an existing entry
      // This ensures that repeated edits don't cause duplicate transfers
      if (myDelta !== 0 || spouseDelta !== 0 || fundingDelta !== 0) {
        const accounts = await storage.getAccountsWithBalances();
        const personalChecking = accounts.find(a => a.name === "Personal Checking (Me)");
        const spouseChecking = accounts.find(a => a.name === "Spouse Checking");
        const jointChecking = accounts.find(a => a.name === "Joint Checking");
        const billsPool = accounts.find(a => a.name === "Bills Pool");
        
        // Transfer My delta: Personal Checking ↔ Joint Checking
        if (myDelta !== 0 && personalChecking && jointChecking) {
          const fromId = myDelta > 0 ? personalChecking.id : jointChecking.id;
          const toId = myDelta > 0 ? jointChecking.id : personalChecking.id;
          await storage.createTransfer({
            date: input.weekStartDate,
            fromAccountId: fromId,
            toAccountId: toId,
            amount: String(Math.abs(myDelta)),
            note: `Bills funding ${myDelta > 0 ? '' : 'adjustment '}(Me) - Week of ${input.weekStartDate}`,
            createdBy: "Me"
          });
        }
        
        // Transfer Spouse delta: Spouse Checking ↔ Joint Checking
        if (spouseDelta !== 0 && spouseChecking && jointChecking) {
          const fromId = spouseDelta > 0 ? spouseChecking.id : jointChecking.id;
          const toId = spouseDelta > 0 ? jointChecking.id : spouseChecking.id;
          await storage.createTransfer({
            date: input.weekStartDate,
            fromAccountId: fromId,
            toAccountId: toId,
            amount: String(Math.abs(spouseDelta)),
            note: `Bills funding ${spouseDelta > 0 ? '' : 'adjustment '}(Spouse) - Week of ${input.weekStartDate}`,
            createdBy: "Spouse"
          });
        }
        
        // Update Bills Pool virtual tracker
        if (fundingDelta !== 0 && billsPool) {
          const newBillsBalance = parseFloat(billsPool.startingBalance || "0") + fundingDelta;
          await storage.updateAccount(billsPool.id, { startingBalance: newBillsBalance.toFixed(2) });
        }
      }
      
      res.json(log);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: err.errors });
        return;
      }
      console.error("Bills funding error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/bills-funding/:weekStartDate", async (req, res) => {
    try {
      const weekStartDate = req.params.weekStartDate;
      
      // Get the existing log to reverse all balance changes
      const logs = await storage.getBillsFundingLogs();
      const existingLog = logs.find(l => l.weekStartDate === weekStartDate);
      
      if (existingLog) {
        const myAmount = parseFloat(existingLog.myTransfer || "0");
        const spouseAmount = parseFloat(existingLog.spouseTransfer || "0");
        const totalToRemove = myAmount + spouseAmount;
        
        const accounts = await storage.getAccountsWithBalances();
        const personalChecking = accounts.find(a => a.name === "Personal Checking (Me)");
        const spouseChecking = accounts.find(a => a.name === "Spouse Checking");
        const jointChecking = accounts.find(a => a.name === "Joint Checking");
        const billsPool = accounts.find(a => a.name === "Bills Pool");
        
        // Reverse: move money back from Joint Checking to Personal/Spouse
        if (myAmount > 0 && personalChecking && jointChecking) {
          await storage.createTransfer({
            date: weekStartDate,
            fromAccountId: jointChecking.id,
            toAccountId: personalChecking.id,
            amount: String(myAmount),
            note: `Bills funding reversal (Me) - Week of ${weekStartDate}`,
            createdBy: "Me"
          });
        }
        if (spouseAmount > 0 && spouseChecking && jointChecking) {
          await storage.createTransfer({
            date: weekStartDate,
            fromAccountId: jointChecking.id,
            toAccountId: spouseChecking.id,
            amount: String(spouseAmount),
            note: `Bills funding reversal (Spouse) - Week of ${weekStartDate}`,
            createdBy: "Spouse"
          });
        }
        
        // Reverse Bills Pool virtual tracker
        if (totalToRemove > 0 && billsPool) {
          const newBillsBalance = parseFloat(billsPool.startingBalance || "0") - totalToRemove;
          await storage.updateAccount(billsPool.id, { startingBalance: newBillsBalance.toFixed(2) });
        }
      }
      
      await storage.deleteBillsFundingLog(weekStartDate);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete bills funding error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // === Exports ===
  app.get(api.exports.csv.path, async (req, res) => {
    const type = req.params.type;
    let data: any[] = [];
    let fields: string[] = [];

    if (type === 'expenses') {
      data = await storage.getBusinessExpenses();
      fields = ['date', 'vendor', 'category', 'amount', 'notes', 'createdAt'];
    } else if (type === 'mileage') {
      data = await storage.getMileageEntries();
      fields = ['date', 'miles', 'purpose', 'createdAt'];
    } else if (type === 'debts') {
      data = await storage.getDebts();
      fields = ['name', 'balance', 'apr', 'monthlyPayment', 'createdAt'];
    } else if (type === 'income') {
      data = await storage.getWeeklyIncomeLogs();
      fields = ['weekStartDate', 'myIncome', 'spouseIncome', 'notes', 'createdAt'];
    } else if (type === 'balances') {
      data = await storage.getAccountBalances();
      fields = ['name', 'balance', 'updatedAt'];
    } else if (type === 'spending') {
      data = await storage.getSpendingLogs();
      fields = ['date', 'amount', 'category', 'paidBy', 'notes', 'createdAt'];
    } else {
      res.status(400).send("Invalid export type");
      return;
    }

    try {
      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(data);
      
      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', `attachment; filename="${type}-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (err) {
      console.error(err);
      res.status(500).send("Error generating CSV");
    }
  });

  // === INVESTMENT SETTINGS (FIRE Planning) ===
  app.get(api.investment.get.path, async (_req, res) => {
    const settings = await storage.getInvestmentSettings();
    res.json(settings || {
      investedBalance: "0",
      monthlyContribution: "0",
      safeWithdrawalRate: "0.04",
      targetMonthlyIncome: "2000",
      expectedAnnualReturn: "0.07",
      currentAge: 30,
      targetAge: 55,
      inflationRate: "0.02",
      useInflationAdjustedGoal: true
    });
  });

  app.post(api.investment.update.path, async (req, res) => {
    try {
      const input = api.investment.update.input.parse(req.body);
      const settings = await storage.updateInvestmentSettings(input);
      res.json(settings);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: err.errors });
        return;
      }
      console.error("Update investment settings error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // === TRANSFERS ===
  app.get(api.transfers.list.path, async (req, res) => {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const transferList = await storage.getTransfers(limit);
    res.json(transferList);
  });

  app.post(api.transfers.create.path, async (req, res) => {
    try {
      const input = api.transfers.create.input.parse(req.body);
      const transfer = await storage.createTransfer(input);
      res.status(201).json(transfer);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: err.errors });
        return;
      }
      console.error("Create transfer error:", err);
      res.status(500).json({ message: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // === CASH SNAPSHOTS ===
  app.get(api.cashSnapshots.get.path, async (req, res) => {
    const weekStartDate = String(req.params.weekStartDate);
    const snapshot = await storage.getWeeklyCashSnapshot(weekStartDate);
    res.json(snapshot || null);
  });

  app.post(api.cashSnapshots.upsert.path, async (req, res) => {
    try {
      const input = api.cashSnapshots.upsert.input.parse(req.body);
      const snapshot = await storage.upsertWeeklyCashSnapshot(input);
      res.json(snapshot);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input", errors: err.errors });
        return;
      }
      console.error("Upsert cash snapshot error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.cashSnapshots.delete.path, async (req, res) => {
    const weekStartDate = String(req.params.weekStartDate);
    await storage.deleteWeeklyCashSnapshot(weekStartDate);
    res.sendStatus(204);
  });

  app.get(api.cashSnapshots.computeTotalCash.path, async (req, res) => {
    const includeTrading = req.query.includeTrading === "true";
    const totalCash = await storage.computeTotalCash(includeTrading);
    res.json({ totalCash, includeTrading });
 });

  // === NEXA OS SUMMARY ENDPOINT ===
  app.get("/api/os/summary", async (_req, res) => {
    try {
      const totalCash = await storage.computeTotalCash(false);
      const totalCashWithTrading = await storage.computeTotalCash(true);
      const accountsWithBalances = await storage.getAccountsWithBalances();
      const now = new Date();
      const day = now.getDay();
      const diff = (day === 0 ? -6 : 1) - day;
      const monday = new Date(now);
      monday.setHours(0, 0, 0, 0);
      monday.setDate(monday.getDate() + diff);
      const currentWeekStart = monday.toISOString().split("T")[0];
      const weekEnd = new Date(monday);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const currentWeekEnd = weekEnd.toISOString().split("T")[0];
      const weeklyIncome = await storage.getWeeklyIncomeFromTransactions(currentWeekStart, currentWeekEnd);
      const debtsWithPayments = await storage.getDebtsWithPayments();
      const totalDebt = debtsWithPayments.reduce((sum, d) => sum + d.remainingBalance, 0);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentTransactions = await storage.getTransactions({
        startDate: thirtyDaysAgo.toISOString().split("T")[0],
        endDate: now.toISOString().split("T")[0],
        type: "expense"
      });
      const monthlySpend = recentTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const investmentSettings = await storage.getInvestmentSettings();
      const budgetSettingsData = await storage.getBudgetSettings();
      res.json({
        generatedAt: new Date().toISOString(),
        cash: { total: totalCash, totalWithTrading: totalCashWithTrading },
        accounts: accountsWithBalances.map(a => ({ id: a.id, name: a.name, type: a.type, currentBalance: a.currentBalance, excludeFromTotals: a.excludeFromTotals })),
        income: { weekStartDate: currentWeekStart, myIncome: weeklyIncome.myIncome, spouseIncome: weeklyIncome.spouseIncome, totalWeekly: weeklyIncome.total, estimatedMonthly: weeklyIncome.total * 4.33 },
        debts: { totalRemaining: totalDebt, count: debtsWithPayments.length, items: debtsWithPayments.map(d => ({ id: d.id, name: d.name, remainingBalance: d.remainingBalance, apr: d.apr, monthlyPayment: d.monthlyPayment })) },
        spending: { last30Days: monthlySpend, transactionCount: recentTransactions.length },
        fire: investmentSettings ? { investedBalance: parseFloat(investmentSettings.investedBalance || "0"), monthlyContribution: parseFloat(investmentSettings.monthlyContribution || "0"), targetMonthlyIncome: parseFloat(investmentSettings.targetMonthlyIncome || "0"), currentAge: investmentSettings.currentAge, targetAge: investmentSettings.targetAge } : null,
        budget: budgetSettingsData ? { monthlyFixedBills: parseFloat(budgetSettingsData.monthlyFixedBills || "0"), savingsMode: budgetSettingsData.savingsMode, savingsValue: parseFloat(budgetSettingsData.savingsValue || "0") } : null,
      });
    } catch (err) {
      console.error("OS summary error:", err);
      res.status(500).json({ message: "Failed to generate OS summary" });
    }
  });
// === AI PROXY ===
  app.post("/api/ai/insights", async (req, res) => {
    try {
      const { prompt } = req.body;
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY || "",
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.error("AI proxy error:", err);
      res.status(500).json({ message: "AI request failed" });
    }
  });
  
  return httpServer;
}
