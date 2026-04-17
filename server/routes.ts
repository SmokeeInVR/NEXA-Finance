import express from "express";
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { Parser } from "json2csv";
import { PlaidApi, PlaidEnvironments, Configuration, Products, CountryCode } from 'plaid';

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Run migrations on startup
  await storage.markBillsPoolAsExcluded();

  // ── Plaid Client Setup ──
  const plaidConfig = new Configuration({
    basePath: PlaidEnvironments[(process.env.PLAID_ENV as keyof typeof PlaidEnvironments) || 'sandbox'],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': (process.env.PLAID_CLIENT_ID || '').trim(),
        'PLAID-SECRET': (process.env.PLAID_SECRET || '').trim(),
      },
    },
  });
  const plaidClient = new PlaidApi(plaidConfig);

  // In-memory token store — resets on redeploy. Upgrade to DB in Phase 4.
  const plaidTokenStore = new Map<string, { accessToken: string; institutionName: string; accounts: any[] }>();
  
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
      if (err instanceof z.ZodError) { res.status(400).json({ message: "Invalid input", errors: err.errors }); return; }
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
      if (err instanceof z.ZodError) { res.status(400).json({ message: "Invalid input", errors: err.errors }); return; }
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
      if (err instanceof z.ZodError) { res.status(400).json({ message: "Invalid input", errors: err.errors }); return; }
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

  // === BUDGET ===
  app.get(api.budget.get.path, async (_req, res) => {
    const settings = await storage.getBudgetSettings();
    const defaultSettings = {
      id: 0, monthlyFixedBills: "0", splitMode: "AUTO", mySplitPct: "50", spouseSplitPct: "50",
      savingsMode: "PERCENT", savingsValue: "0", investingMode: "PERCENT", investingValue: "0",
      debtBufferMode: "PERCENT", debtBufferValue: "0", tradingMode: "PERCENT", tradingValue: "0",
      allocationFrequency: "MONTHLY", incomeSource: "MANUAL", avgWindowWeeks: 4,
      bufferGoalAmount: "1000", bufferRerouteEnabled: false, rerouteTarget: "SAVINGS", updatedAt: new Date()
    };
    res.json(settings || defaultSettings);
  });

  app.post(api.budget.update.path, async (req, res) => {
    try {
      const input = api.budget.update.input.parse(req.body);
      const settings = await storage.updateBudgetSettings(input);
      res.json(settings);
    } catch (err) {
      if (err instanceof z.ZodError) { res.status(400).json({ message: "Invalid input", errors: err.errors }); return; }
      console.error("Update budget error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // === SPENDING ===
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
      if (err instanceof z.ZodError) { res.status(400).json({ message: "Invalid input" }); return; }
      throw err;
    }
  });

  app.delete(api.spending.delete.path, async (req, res) => {
    await storage.deleteSpendingLog(Number(req.params.id));
    res.sendStatus(204);
  });

  // === DEBTS ===
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
      if (err instanceof z.ZodError) { res.status(400).json({ message: "Invalid input" }); return; }
      throw err;
    }
  });

  app.patch(api.debts.update.path, async (req, res) => {
    try {
      const input = api.debts.update.input.parse(req.body);
      const updated = await storage.updateDebt(Number(req.params.id), input.balance);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) { res.status(400).json({ message: "Invalid input" }); return; }
      throw err;
    }
  });

  app.delete(api.debts.delete.path, async (req, res) => {
    await storage.deleteDebt(Number(req.params.id));
    res.sendStatus(204);
  });

  // === BUSINESS EXPENSES ===
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
      if (err instanceof z.ZodError) { res.status(400).json({ message: "Invalid input" }); return; }
      throw err;
    }
  });

  app.delete(api.business.expenses.delete.path, async (req, res) => {
    await storage.deleteBusinessExpense(Number(req.params.id));
    res.sendStatus(204);
  });

  // === MILEAGE ===
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
      if (err instanceof z.ZodError) { res.status(400).json({ message: "Invalid input" }); return; }
      throw err;
    }
  });

  app.delete(api.business.mileage.delete.path, async (req, res) => {
    await storage.deleteMileageEntry(Number(req.params.id));
    res.sendStatus(204);
  });

  // === BUSINESS INCOME ===
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
      if (err instanceof z.ZodError) { res.status(400).json({ message: "Invalid input" }); return; }
      throw err;
    }
  });

  app.delete(api.business.income.delete.path, async (req, res) => {
    await storage.deleteBusinessIncomeLog(Number(req.params.id));
    res.sendStatus(204);
  });

  // === BUSINESS SETTINGS ===
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
      if (err instanceof z.ZodError) { res.status(400).json({ message: "Invalid input" }); return; }
      throw err;
    }
  });

  // === INCOME LOG ===
  app.get(api.income.list.path, async (_req, res) => {
    const logs = await storage.getWeeklyIncomeLogs();
    res.json(logs);
  });

  app.post(api.income.create.path, async (req, res) => {
    try {
      console.log("POST /api/income - Body:", req.body);
      const input = api.income.create.input.parse(req.body);
      console.log("POST /api/income - Parsed input:", input);
      const existingLogs = await storage.getWeeklyIncomeLogs();
      const existingLog = existingLogs.find(log => log.weekStartDate === input.weekStartDate);
      const shouldDeposit = input.deposited && !existingLog?.deposited;
      const log = await storage.upsertWeeklyIncomeLog(input);
      console.log("POST /api/income - Upsert result:", log);
      if (shouldDeposit) {
        const myAmount = parseFloat(String(input.myIncome || 0));
        const spouseAmount = parseFloat(String(input.spouseIncome || 0));
        if (myAmount > 0 && input.myDepositAccountId) {
          const myAccount = await storage.getAccountById(input.myDepositAccountId);
          if (myAccount) {
            const newBalance = parseFloat(myAccount.startingBalance || "0") + myAmount;
            await storage.updateAccount(input.myDepositAccountId, { startingBalance: String(newBalance) });
            console.log(`Deposited $${myAmount} to account ${myAccount.name}`);
          }
        }
        if (spouseAmount > 0 && input.spouseDepositAccountId) {
          const spouseAccount = await storage.getAccountById(input.spouseDepositAccountId);
          if (spouseAccount) {
            const newBalance = parseFloat(spouseAccount.startingBalance || "0") + spouseAmount;
            await storage.updateAccount(input.spouseDepositAccountId, { startingBalance: String(newBalance) });
            console.log(`Deposited $${spouseAmount} to account ${spouseAccount.name}`);
          }
        }
      }
      res.status(201).json(log);
    } catch (err: any) {
      if (err instanceof z.ZodError) { console.error("Zod error for income:", err.errors); res.status(400).json({ message: "Invalid input", errors: err.errors }); return; }
      console.error("Income log error:", err);
      res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  app.delete(api.income.delete.path, async (req, res) => {
    await storage.deleteWeeklyIncomeLog(Number(req.params.id));
    res.sendStatus(204);
  });

  app.get("/api/income/pay-day", async (req, res) => {
    // Returns whether today is a pay day and when next pay day is
    try {
      const payDay = parseInt(process.env.PAY_DAY_OF_WEEK || "3"); // 3 = Wednesday
      const today = new Date();
      const todayDay = today.getDay();
      const isPayDay = todayDay === payDay;
      const daysUntil = isPayDay ? 0 : (payDay - todayDay + 7) % 7;
      const nextPayDay = new Date(today);
      nextPayDay.setDate(today.getDate() + daysUntil);
      res.json({ isPayDay, nextPayDay: nextPayDay.toISOString().split("T")[0], payDayName: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][payDay] });
    } catch(e) { res.status(500).json({ message: "Failed" }); }
  });

  app.get("/api/income/latest", async (req, res) => {
    const logs = await storage.getWeeklyIncomeLogs();
    const now = new Date();
    const day = now.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() + diff);
    const currentWeekStart = monday.toISOString().split("T")[0];
    const currentWeekLog = logs.find(l => l.weekStartDate === currentWeekStart);
    if (currentWeekLog) {
      const myIncome = parseFloat(String(currentWeekLog.myIncome));
      const spouseIncome = parseFloat(String(currentWeekLog.spouseIncome));
      res.json({ weekStartDate: currentWeekLog.weekStartDate, myIncome, spouseIncome, totalWeeklyIncome: myIncome + spouseIncome, updatedAt: currentWeekLog.createdAt });
    } else {
      const mostRecent = logs[0];
      if (mostRecent) {
        const myIncome = parseFloat(String(mostRecent.myIncome));
        const spouseIncome = parseFloat(String(mostRecent.spouseIncome));
        res.json({ weekStartDate: currentWeekStart, myIncome, spouseIncome, totalWeeklyIncome: myIncome + spouseIncome, updatedAt: mostRecent.createdAt, carriedForward: true });
      } else {
        res.json({ weekStartDate: currentWeekStart, myIncome: 0, spouseIncome: 0, totalWeeklyIncome: 0, updatedAt: null });
      }
    }
  });

  // === BALANCES ===
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
      if (err instanceof z.ZodError) { res.status(400).json({ message: "Invalid input" }); return; }
      throw err;
    }
  });

  // === BILLS FUNDING ===
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
      const existingLogs = await storage.getBillsFundingLogs();
      const existingLog = existingLogs.find(l => l.weekStartDate === input.weekStartDate);
      const previousMy = existingLog ? parseFloat(existingLog.myTransfer || "0") : 0;
      const previousSpouse = existingLog ? parseFloat(existingLog.spouseTransfer || "0") : 0;
      const previousTotal = previousMy + previousSpouse;
      const fundingDelta = totalFunding - previousTotal;
      const myDelta = myAmount - previousMy;
      const spouseDelta = spouseAmount - previousSpouse;
      const log = await storage.upsertBillsFundingLog(input);
      if (myDelta !== 0 || spouseDelta !== 0 || fundingDelta !== 0) {
        const accts = await storage.getAccountsWithBalances();
        const personalChecking = accts.find(a => a.name === "Personal Checking (Me)");
        const spouseChecking = accts.find(a => a.name === "Spouse Checking");
        const jointChecking = accts.find(a => a.name === "Joint Checking");
        const billsPool = accts.find(a => a.name === "Bills Pool");
        if (myDelta !== 0 && personalChecking && jointChecking) {
          const fromId = myDelta > 0 ? personalChecking.id : jointChecking.id;
          const toId = myDelta > 0 ? jointChecking.id : personalChecking.id;
          await storage.createTransfer({ date: input.weekStartDate, fromAccountId: fromId, toAccountId: toId, amount: String(Math.abs(myDelta)), note: `Bills funding ${myDelta > 0 ? '' : 'adjustment '}(Me) - Week of ${input.weekStartDate}`, createdBy: "Me" });
        }
        if (spouseDelta !== 0 && spouseChecking && jointChecking) {
          const fromId = spouseDelta > 0 ? spouseChecking.id : jointChecking.id;
          const toId = spouseDelta > 0 ? jointChecking.id : spouseChecking.id;
          await storage.createTransfer({ date: input.weekStartDate, fromAccountId: fromId, toAccountId: toId, amount: String(Math.abs(spouseDelta)), note: `Bills funding ${spouseDelta > 0 ? '' : 'adjustment '}(Spouse) - Week of ${input.weekStartDate}`, createdBy: "Spouse" });
        }
        if (fundingDelta !== 0 && billsPool) {
          const newBillsBalance = parseFloat(billsPool.startingBalance || "0") + fundingDelta;
          await storage.updateAccount(billsPool.id, { startingBalance: newBillsBalance.toFixed(2) });
        }
      }
      res.json(log);
    } catch (err) {
      if (err instanceof z.ZodError) { res.status(400).json({ message: "Invalid input", errors: err.errors }); return; }
      console.error("Bills funding error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/bills-funding/:weekStartDate", async (req, res) => {
    try {
      const weekStartDate = req.params.weekStartDate;
      const logs = await storage.getBillsFundingLogs();
      const existingLog = logs.find(l => l.weekStartDate === weekStartDate);
      if (existingLog) {
        const myAmount = parseFloat(existingLog.myTransfer || "0");
        const spouseAmount = parseFloat(existingLog.spouseTransfer || "0");
        const totalToRemove = myAmount + spouseAmount;
        const accts = await storage.getAccountsWithBalances();
        const personalChecking = accts.find(a => a.name === "Personal Checking (Me)");
        const spouseChecking = accts.find(a => a.name === "Spouse Checking");
        const jointChecking = accts.find(a => a.name === "Joint Checking");
        const billsPool = accts.find(a => a.name === "Bills Pool");
        if (myAmount > 0 && personalChecking && jointChecking) {
          await storage.createTransfer({ date: weekStartDate, fromAccountId: jointChecking.id, toAccountId: personalChecking.id, amount: String(myAmount), note: `Bills funding reversal (Me) - Week of ${weekStartDate}`, createdBy: "Me" });
        }
        if (spouseAmount > 0 && spouseChecking && jointChecking) {
          await storage.createTransfer({ date: weekStartDate, fromAccountId: jointChecking.id, toAccountId: spouseChecking.id, amount: String(spouseAmount), note: `Bills funding reversal (Spouse) - Week of ${weekStartDate}`, createdBy: "Spouse" });
        }
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

  // === EXPORTS ===
  app.get(api.exports.csv.path, async (req, res) => {
    const type = req.params.type;
    let data: any[] = [];
    let fields: string[] = [];
    if (type === 'expenses') { data = await storage.getBusinessExpenses(); fields = ['date', 'vendor', 'category', 'amount', 'notes', 'createdAt']; }
    else if (type === 'mileage') { data = await storage.getMileageEntries(); fields = ['date', 'miles', 'purpose', 'createdAt']; }
    else if (type === 'debts') { data = await storage.getDebts(); fields = ['name', 'balance', 'apr', 'monthlyPayment', 'createdAt']; }
    else if (type === 'income') { data = await storage.getWeeklyIncomeLogs(); fields = ['weekStartDate', 'myIncome', 'spouseIncome', 'notes', 'createdAt']; }
    else if (type === 'balances') { data = await storage.getAccountBalances(); fields = ['name', 'balance', 'updatedAt']; }
    else if (type === 'spending') { data = await storage.getSpendingLogs(); fields = ['date', 'amount', 'category', 'paidBy', 'notes', 'createdAt']; }
    else { res.status(400).send("Invalid export type"); return; }
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
    res.json(settings || { investedBalance: "0", monthlyContribution: "0", safeWithdrawalRate: "0.04", targetMonthlyIncome: "2000", expectedAnnualReturn: "0.07", currentAge: 30, targetAge: 55, inflationRate: "0.02", useInflationAdjustedGoal: true });
  });

  app.post(api.investment.update.path, async (req, res) => {
    try {
      const input = api.investment.update.input.parse(req.body);
      const settings = await storage.updateInvestmentSettings(input);
      res.json(settings);
    } catch (err) {
      if (err instanceof z.ZodError) { res.status(400).json({ message: "Invalid input", errors: err.errors }); return; }
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
      if (err instanceof z.ZodError) { res.status(400).json({ message: "Invalid input", errors: err.errors }); return; }
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
      if (err instanceof z.ZodError) { res.status(400).json({ message: "Invalid input", errors: err.errors }); return; }
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
      const weeklyIncomeLogs = await storage.getWeeklyIncomeLogs();
      const currentWeekLog = weeklyIncomeLogs.find(l => l.weekStartDate === currentWeekStart);
      const mostRecentLog = weeklyIncomeLogs[0];
      const activeLog = currentWeekLog || mostRecentLog;
      const weeklyIncomeData = {
        myIncome: activeLog ? parseFloat(String(activeLog.myIncome)) : 0,
        spouseIncome: activeLog ? parseFloat(String(activeLog.spouseIncome)) : 0,
        total: activeLog ? parseFloat(String(activeLog.myIncome)) + parseFloat(String(activeLog.spouseIncome)) : 0,
      };
      const debtsWithPayments = await storage.getDebtsWithPayments();
      const totalDebt = debtsWithPayments.reduce((sum, d) => sum + d.remainingBalance, 0);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentTransactions = await storage.getTransactions({ startDate: thirtyDaysAgo.toISOString().split("T")[0], endDate: now.toISOString().split("T")[0], type: "expense" });
      const monthlySpend = recentTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const investmentSettings = await storage.getInvestmentSettings();
      const budgetSettingsData = await storage.getBudgetSettings();
      res.json({
        generatedAt: new Date().toISOString(),
        cash: { total: totalCash, totalWithTrading: totalCashWithTrading },
        accounts: accountsWithBalances.map(a => ({ id: a.id, name: a.name, type: a.type, currentBalance: a.currentBalance, excludeFromTotals: a.excludeFromTotals })),
        income: { weekStartDate: currentWeekStart, myIncome: weeklyIncomeData.myIncome, spouseIncome: weeklyIncomeData.spouseIncome, totalWeekly: weeklyIncomeData.total, estimatedMonthly: weeklyIncomeData.total * 4.33 },
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
      const apiKey = process.env.GEMINI_API_KEY || "";
      if (!apiKey) { res.status(500).json({ message: "Gemini API key not configured" }); return; }
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash/generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1000 }
        })
      });
      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.error("AI proxy error:", err);
      res.status(500).json({ message: "AI request failed" });
    }
  });

  // === ELEVENLABS TTS PROXY ===
  // ── AI Chat Proxy (for mobile PWA compatibility) ──────────────────────────
  // ── Food Scan (handles large image payloads) ──────────────────────────────
  app.post("/api/ai/food-scan", express.json({ limit: "10mb" }), async (req, res) => {
    try {
      const { apiKey, image, mediaType } = req.body;
      if (!image) { res.status(400).json({ message: "image required" }); return; }
      const key = process.env.GEMINI_API_KEY || apiKey;
      if (!key) { res.status(500).json({ message: "No API key configured" }); return; }
      const r = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash/generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: "You are a nutrition expert. Analyze food photos and return accurate macro estimates." }] },
          contents: [{
            parts: [
              { inline_data: { mime_type: mediaType || "image/jpeg", data: image } },
              { text: 'Analyze this meal photo. Return ONLY valid JSON: {"name":"Grilled Chicken & Rice","calories":520,"protein":42,"carbs":48,"fat":12,"fiber":3,"confidence":"medium","notes":"Estimated based on visible portion size"}' }
            ]
          }],
          generationConfig: { maxOutputTokens: 400 }
        }),
      });
      const data = await r.json();
      if (!r.ok) { res.status(r.status).json(data); return; }
      res.json(data);
    } catch (err) {
      console.error("Food scan error:", err);
      res.status(500).json({ message: "Food scan failed" });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { messages, system, max_tokens, apiKey } = req.body;
      if (!messages) { res.status(400).json({ message: "messages required" }); return; }
      // Use server key first, fall back to client-provided key
      const key = process.env.GEMINI_API_KEY || apiKey;
      if (!key) {
        console.error("No Gemini API key found. ENV var:", !!process.env.GEMINI_API_KEY, "Client key:", !!apiKey);
        res.status(500).json({ message: "No Gemini API key configured - set GEMINI_API_KEY in Railway environment" });
        return;
      }

      // Convert messages from Anthropic format to Gemini format
      const contents = messages.map((msg: any) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      }));

      const body: any = {
        contents,
        generationConfig: { maxOutputTokens: max_tokens || 2000 }
      };
      if (system) body.system_instruction = { parts: [{ text: system }] };

      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro/generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const responseText = await r.text();
      console.log("Gemini response status:", r.status, "Body:", responseText.substring(0, 200));

      if (!r.ok) {
        console.error("Gemini API error:", responseText);
        res.status(r.status).json({ message: `Gemini API error: ${r.status}`, detail: responseText });
        return;
      }

      const data = JSON.parse(responseText);
      res.json(data);
    } catch (err) {
      console.error("Chat proxy error:", err);
      res.status(500).json({ message: "Chat proxy failed", error: String(err) });
    }
  });

  app.post("/api/ai/speak", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== "string") { res.status(400).json({ message: "text is required" }); return; }
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) { res.status(500).json({ message: "ElevenLabs API key not configured" }); return; }
      const trimmed = text.slice(0, 2500);
      const voiceId = process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB";
      const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
        body: JSON.stringify({ text: trimmed, model_id: "eleven_turbo_v2_5", voice_settings: { stability: 0.55, similarity_boost: 0.90, style: 0.15, use_speaker_boost: true } })
      });
      if (!elevenRes.ok) {
        const errText = await elevenRes.text();
        console.error("ElevenLabs error:", elevenRes.status, errText);
        res.status(elevenRes.status).json({ message: "ElevenLabs TTS failed", detail: errText });
        return;
      }
      const audioBuffer = await elevenRes.arrayBuffer();
      res.set("Content-Type", "audio/mpeg");
      res.set("Content-Length", String(audioBuffer.byteLength));
      res.send(Buffer.from(audioBuffer));
    } catch (err) {
      console.error("TTS proxy error:", err);
      res.status(500).json({ message: "TTS request failed" });
    }
  });

  // === NEXA OS CAMPAIGN SYNC ===
  app.get("/api/os/campaign", async (_req, res) => {
    try {
      const data = await storage.getCampaign();
      res.json(data || null);
    } catch (err) {
      console.error("Get campaign error:", err);
      res.status(500).json({ message: "Failed to get campaign" });
    }
  });

  app.post("/api/os/campaign", async (req, res) => {
    try {
      await storage.saveCampaign(req.body);
      res.json({ success: true });
    } catch (err) {
      console.error("Save campaign error:", err);
      res.status(500).json({ message: "Failed to save campaign" });
    }
  });

  // === BILL SCHEDULE ===
  app.get("/api/bill-schedule", async (_req, res) => {
    try {
      const bills = await storage.getBillSchedule();
      res.json(bills);
    } catch (err) {
      console.error("Get bill schedule error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/bill-schedule", async (req, res) => {
    try {
      const { name, amount, dueDay, category, isVariable, autopay, notes } = req.body;
      if (!name || !amount || !dueDay) {
        res.status(400).json({ message: "name, amount, and dueDay are required" });
        return;
      }
      const item = await storage.createBillScheduleItem({
        name, amount: String(amount), dueDay: Number(dueDay),
        category: category || "Other", isVariable: !!isVariable,
        autopay: !!autopay, notes: notes || null,
      });
      res.status(201).json(item);
    } catch (err) {
      console.error("Create bill schedule error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/bill-schedule/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { name, amount, dueDay, category, isVariable, autopay, notes } = req.body;
      const item = await storage.updateBillScheduleItem(id, {
        ...(name !== undefined && { name }),
        ...(amount !== undefined && { amount: String(amount) }),
        ...(dueDay !== undefined && { dueDay: Number(dueDay) }),
        ...(category !== undefined && { category }),
        ...(isVariable !== undefined && { isVariable: !!isVariable }),
        ...(autopay !== undefined && { autopay: !!autopay }),
        ...(notes !== undefined && { notes }),
      });
      res.json(item);
    } catch (err) {
      console.error("Update bill schedule error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/bill-schedule/:id", async (req, res) => {
    try {
      await storage.deleteBillScheduleItem(Number(req.params.id));
      res.sendStatus(204);
    } catch (err) {
      console.error("Delete bill schedule error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ═══════════════════════════════════════════════
  // === MEAL PLANNER SYNC ===
  // Stores the current meal plan from the Vercel
  // Meal Planner app so Nexa OS can read it.
  // In-memory store — persists across requests but
  // resets on Railway redeploy (acceptable for now).
  // ═══════════════════════════════════════════════
  let mealPlanStore: any = null;

  app.post("/api/meals/save", async (req, res) => {
    try {
      const { plan, generatedAt, estimatedTotal, cookMeals, cuisineStyle } = req.body;
      if (!plan) { res.status(400).json({ message: "plan is required" }); return; }
      mealPlanStore = {
        plan,
        generatedAt: generatedAt || new Date().toISOString(),
        estimatedTotal: estimatedTotal || 0,
        cookMeals: cookMeals || [],
        cuisineStyle: cuisineStyle || null,
        savedAt: new Date().toISOString(),
      };
      res.json({ success: true });
    } catch (err) {
      console.error("Save meal plan error:", err);
      res.status(500).json({ message: "Failed to save meal plan" });
    }
  });

  app.get("/api/meals/summary", async (_req, res) => {
    try {
      if (!mealPlanStore) { res.json(null); return; }
      const today = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()];
      const plan = mealPlanStore.plan;
      const todayMeal = plan?.weeklyMealPlan?.find((d: any) => d.day === today);
      const tomorrowDay = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][(new Date().getDay() + 1) % 7];
      const tomorrowMeal = plan?.weeklyMealPlan?.find((d: any) => d.day === tomorrowDay);
      res.json({
        generatedAt: mealPlanStore.generatedAt,
        savedAt: mealPlanStore.savedAt,
        estimatedTotal: mealPlanStore.estimatedTotal,
        cuisineStyle: mealPlanStore.cuisineStyle,
        cookMeals: mealPlanStore.cookMeals,
        today: todayMeal ? {
          day: todayMeal.day,
          name: todayMeal.dinner.name,
          isLeftover: !!todayMeal.isLeftoverNight,
          babyVersion: todayMeal.dinner.babyVersion,
          batchNote: todayMeal.dinner.batchNote || null,
        } : null,
        tomorrow: tomorrowMeal ? {
          day: tomorrowMeal.day,
          name: tomorrowMeal.dinner.name,
          isLeftover: !!tomorrowMeal.isLeftoverNight,
        } : null,
        weeklyMeals: plan?.weeklyMealPlan?.map((d: any) => ({
          day: d.day,
          name: d.dinner.name,
          isLeftover: !!d.isLeftoverNight,
        })) || [],
      });
    } catch (err) {
      console.error("Meal summary error:", err);
      res.status(500).json({ message: "Failed to get meal summary" });
    }
  });

  // ═══ FITNESS SUMMARY ═══════════════════════════════
  let fitnessStore: any = null;

  app.post("/api/fitness/summary", async (req, res) => {
    try {
      const { user, todayWorkout, weeklyCount, waterToday, waterGoal, streak } = req.body;
      fitnessStore = { user: user||"Husband", todayWorkout: todayWorkout||null, weeklyCount: weeklyCount||0, waterToday: waterToday||0, waterGoal: waterGoal||8, streak: streak||0, savedAt: new Date().toISOString() };
      res.json({ success: true });
    } catch (err) { res.status(500).json({ message: "Failed to save fitness data" }); }
  });

  app.get("/api/fitness/summary", async (_req, res) => {
    try { res.json(fitnessStore || null); }
    catch (err) { res.status(500).json({ message: "Failed to get fitness summary" }); }
  });

  // ═══ FAMILY SUMMARY ════════════════════════════════
  let familyStore: any = null;

  app.post("/api/family/summary", async (req, res) => {
    try {
      const { dinner, tasksDone, tasksTotal, babyNapping, babyMood, todayEvents, napDuration } = req.body;
      familyStore = { dinner: dinner||null, tasksDone: tasksDone||0, tasksTotal: tasksTotal||0, tasksPct: tasksTotal>0?Math.round((tasksDone/tasksTotal)*100):0, babyNapping: babyNapping||false, babyMood: babyMood||null, napDuration: napDuration||null, todayEvents: (todayEvents && todayEvents.length > 0) ? todayEvents : (familyStore.todayEvents||[]), savedAt: new Date().toISOString() };
      res.json({ success: true });
    } catch (err) { res.status(500).json({ message: "Failed to save family data" }); }
  });

  app.get("/api/family/summary", async (_req, res) => {
    try { res.json(familyStore || null); }
    catch (err) { res.status(500).json({ message: "Failed to get family summary" }); }
  });

  // ═══ TRADING SUMMARY PROXY ═════════════════════════
  // ── CLOUD SYNC ──────────────────────────────────────────────────────────────
  const syncStore = new Map<string, any>();

  app.post("/api/sync/save", async (req, res) => {
    try {
      const { familyId, appName, data } = req.body;
      if(!familyId || !appName || !data) { res.status(400).json({ message: "Missing fields" }); return; }
      const key = `${familyId}:${appName}`;
      syncStore.set(key, { data, updatedAt: new Date().toISOString() });
      res.json({ success: true, updatedAt: syncStore.get(key).updatedAt });
    } catch(e) { res.status(500).json({ message: "Sync save failed" }); }
  });

  app.get("/api/sync/load", async (req, res) => {
    try {
      const { familyId, appName } = req.query as { familyId: string; appName: string };
      if(!familyId || !appName) { res.status(400).json({ message: "Missing fields" }); return; }
      const key = `${familyId}:${appName}`;
      const stored = syncStore.get(key);
      if(!stored) { res.status(404).json({ message: "No data found" }); return; }
      res.json(stored);
    } catch(e) { res.status(500).json({ message: "Sync load failed" }); }
  });

  app.get("/api/trading/summary", async (_req, res) => {
    try {
      const tradeUrl = process.env.NEXATRADE_URL;
      if (!tradeUrl) { res.json(null); return; }
      const r = await fetch(`${tradeUrl}/api/trading/summary`);
      if (!r.ok) { res.json(null); return; }
      res.json(await r.json());
    } catch (err) { res.json(null); }
  });


  // ═══ OS TIME BLOCKS ════════════════════════════════
  // Stores scheduled inspection/work time blocks for Nexa OS dashboard.
  // In-memory — resets on Railway redeploy (acceptable for now).
  const osBlocksStore: any[] = [];

  app.get("/api/os/blocks", async (_req, res) => {
    try {
      res.json(osBlocksStore);
    } catch (err) {
      res.status(500).json({ message: "Failed to get OS blocks" });
    }
  });

  app.post("/api/os/blocks", async (req, res) => {
    try {
      const { id, title, startTime, endTime, type, category, location, notes, date } = req.body;
      if (!title || !startTime) {
        res.status(400).json({ message: "title and startTime are required" });
        return;
      }
      const block = {
        id: id || `block-${Date.now()}`,
        title,
        startTime,
        endTime: endTime || null,
        type: type || "work",
        category: category || "work",
        location: location || null,
        notes: notes || null,
        date: date || startTime.split("T")[0],
        createdAt: new Date().toISOString()
      };
      const existingIdx = osBlocksStore.findIndex((b: any) => b.id === block.id);
      if (existingIdx !== -1) {
        osBlocksStore[existingIdx] = block;
      } else {
        osBlocksStore.push(block);
      }
      res.status(201).json(block);
    } catch (err) {
      res.status(500).json({ message: "Failed to save OS block" });
    }
  });

  app.delete("/api/os/blocks/:id", async (req, res) => {
    try {
      const idx = osBlocksStore.findIndex((b: any) => b.id === req.params.id);
      if (idx !== -1) osBlocksStore.splice(idx, 1);
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ message: "Failed to delete OS block" });
    }
  });

  
  // ===== PLAID ROUTES =====

  app.post("/api/plaid/create-link-token", async (req, res) => {
    try {
      if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
        res.status(500).json({ message: "Plaid not configured — add PLAID_CLIENT_ID and PLAID_SECRET to Railway env vars" });
        return;
      }
      const response = await plaidClient.linkTokenCreate({
        user: { client_user_id: "nexa-user-1" },
        client_name: "NEXA Finance",
        products: [Products.Transactions],
        country_codes: [CountryCode.Us],
        language: "en",
      });
      res.json({ link_token: response.data.link_token });
    } catch (err: any) {
      console.error("Plaid create-link-token error:", err?.response?.data || err);
      res.status(500).json({ message: "Failed to create Plaid link token", error: err?.response?.data || err?.message || String(err) });
    }
  });

  app.post("/api/plaid/exchange-token", async (req, res) => {
    try {
      const { public_token, institution_name } = req.body;
      if (!public_token) {
        res.status(400).json({ message: "public_token required" });
        return;
      }
      const exchangeResponse = await plaidClient.itemPublicTokenExchange({ public_token });
      const accessToken = exchangeResponse.data.access_token;
      const itemId = exchangeResponse.data.item_id;
      const accountsResponse = await plaidClient.accountsGet({ access_token: accessToken });
      const accounts = accountsResponse.data.accounts.map(a => ({
        accountId: a.account_id,
        name: a.name,
        mask: a.mask,
        type: a.type,
        subtype: a.subtype,
        balance: a.balances.current,
        availableBalance: a.balances.available,
      }));
      plaidTokenStore.set(itemId, { accessToken, institutionName: institution_name || "Connected Bank", accounts });
      console.log(`Plaid connected: ${institution_name} (${accounts.length} accounts)`);
      res.json({ success: true, itemId, institutionName: institution_name || "Connected Bank", accounts });
    } catch (err: any) {
      console.error("Plaid exchange-token error:", err?.response?.data || err);
      res.status(500).json({ message: "Failed to exchange Plaid token" });
    }
  });
  app.get("/api/plaid/accounts", async (_req, res) => {
    try {
      if (plaidTokenStore.size === 0) { res.json({ connected: false, institutions: [] }); return; }
      const institutions = [];
      for (const [itemId, stored] of plaidTokenStore.entries()) {
        try {
          const response = await plaidClient.accountsGet({ access_token: stored.accessToken });
          const accounts = response.data.accounts.map(a => ({
            accountId: a.account_id, name: a.name, mask: a.mask, type: a.type,
            subtype: a.subtype, balance: a.balances.current,
            availableBalance: a.balances.available, isoCurrencyCode: a.balances.iso_currency_code,
          }));
          plaidTokenStore.set(itemId, { ...stored, accounts });
          institutions.push({ itemId, institutionName: stored.institutionName, accounts });
        } catch (err) { console.warn(`Failed to fetch accounts for item ${itemId}:`, err); }
      }
      const totalBalance = institutions.flatMap(i => i.accounts)
        .filter(a => a.type === "depository").reduce((sum, a) => sum + (a.balance || 0), 0);
      res.json({ connected: true, institutions, totalBalance, lastUpdated: new Date().toISOString() });
    } catch (err: any) {
      console.error("Plaid accounts error:", err?.response?.data || err);
      res.status(500).json({ message: "Failed to fetch Plaid accounts" });
    }
  });

  app.get("/api/plaid/transactions", async (req, res) => {
    try {
      if (plaidTokenStore.size === 0) { res.json({ connected: false, transactions: [] }); return; }
      const days = Number(req.query.days) || 30;
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
      const allTransactions: any[] = [];
      for (const [itemId, stored] of plaidTokenStore.entries()) {
        try {
          const response = await plaidClient.transactionsGet({ access_token: stored.accessToken, start_date: startDate, end_date: endDate });
          allTransactions.push(...response.data.transactions.map(t => ({
            transactionId: t.transaction_id, accountId: t.account_id, date: t.date,
            name: t.name, amount: t.amount, category: t.category?.[0] || "Uncategorized",
            subcategory: t.category?.[1] || null, merchantName: t.merchant_name,
            institutionName: stored.institutionName, pending: t.pending,
          })));
        } catch (err) { console.warn(`Failed to fetch transactions for item ${itemId}:`, err); }
      }
      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      res.json({ connected: true, transactions: allTransactions, count: allTransactions.length, startDate, endDate });
    } catch (err: any) {
      console.error("Plaid transactions error:", err?.response?.data || err);
      res.status(500).json({ message: "Failed to fetch Plaid transactions" });
    }
  });
  app.post("/api/plaid/sync", async (req, res) => {
    try {
      if (plaidTokenStore.size === 0) { res.json({ connected: false, message: "No banks connected yet" }); return; }
      const results: any[] = [];
      let totalDeposits = 0;
      for (const [itemId, stored] of plaidTokenStore.entries()) {
        try {
          const balanceResponse = await plaidClient.accountsGet({ access_token: stored.accessToken });
          const endDate = new Date().toISOString().split("T")[0];
          const startDate = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
          const txResponse = await plaidClient.transactionsGet({ access_token: stored.accessToken, start_date: startDate, end_date: endDate });
          const deposits = txResponse.data.transactions
            .filter(t => t.amount < 0 && Math.abs(t.amount) > 100)
            .map(t => ({ date: t.date, amount: Math.abs(t.amount), name: t.name,
              accountName: balanceResponse.data.accounts.find(a => a.account_id === t.account_id)?.name }));
          totalDeposits += deposits.reduce((sum, d) => sum + d.amount, 0);
          const accounts = balanceResponse.data.accounts.map(a => ({
            accountId: a.account_id, name: a.name, balance: a.balances.current,
            availableBalance: a.balances.available, type: a.type,
          }));
          plaidTokenStore.set(itemId, { ...stored, accounts });
          results.push({ institutionName: stored.institutionName, accounts, recentDeposits: deposits });
        } catch (err) { console.warn(`Sync failed for item ${itemId}:`, err); }
      }
      res.json({ success: true, syncedAt: new Date().toISOString(), institutions: results, totalRecentDeposits: totalDeposits });
    } catch (err: any) {
      console.error("Plaid sync error:", err?.response?.data || err);
      res.status(500).json({ message: "Plaid sync failed" });
    }
  });

  app.get("/api/plaid/status", async (_req, res) => {
    try {
      const institutions = Array.from(plaidTokenStore.entries()).map(([itemId, stored]) => ({
        itemId, institutionName: stored.institutionName, accountCount: stored.accounts.length,
        accounts: stored.accounts.map(a => ({ name: a.name, mask: a.mask, type: a.type })),
      }));
      res.json({ connected: plaidTokenStore.size > 0, institutionCount: plaidTokenStore.size,
        institutions, plaidEnv: process.env.PLAID_ENV || "sandbox" });
    } catch (err) { res.status(500).json({ message: "Failed to get Plaid status" }); }
  });

  app.delete("/api/plaid/disconnect/:itemId", async (req, res) => {
    try {
      const { itemId } = req.params;
      if (plaidTokenStore.has(itemId)) {
        const stored = plaidTokenStore.get(itemId)!;
        await plaidClient.itemRemove({ access_token: stored.accessToken });
        plaidTokenStore.delete(itemId);
        res.json({ success: true, message: `Disconnected ${stored.institutionName}` });
      } else { res.status(404).json({ message: "Bank not found" }); }
    } catch (err: any) {
      console.error("Plaid disconnect error:", err?.response?.data || err);
      res.status(500).json({ message: "Failed to disconnect bank" });
    }
  });

  app.get("/api/plaid/balance-summary", async (_req, res) => {
    try {
      if (plaidTokenStore.size === 0) { res.json({ connected: false }); return; }
      let totalChecking = 0, totalSavings = 0, totalCredit = 0;
      const accounts: any[] = [];
      for (const [, stored] of plaidTokenStore.entries()) {
        for (const account of stored.accounts) {
          const balance = account.balance || 0;
          if (account.type === "depository") {
            account.subtype === "savings" ? totalSavings += balance : totalChecking += balance;
          } else if (account.type === "credit") { totalCredit += balance; }
          accounts.push({ ...account, institutionName: stored.institutionName });
        }
      }
      res.json({ connected: true, totalCash: totalChecking + totalSavings, totalChecking,
        totalSavings, totalCreditOwed: totalCredit, accounts, lastUpdated: new Date().toISOString() });
    } catch (err) { res.status(500).json({ message: "Failed to get balance summary" }); }
  });
return httpServer;
}
