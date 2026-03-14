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
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] })
      });
      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.error("AI proxy error:", err);
      res.status(500).json({ message: "AI request failed" });
    }
  });

  // === ELEVENLABS TTS PROXY ===
  app.post("/api/ai/speak", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== "string") { res.status(400).json({ message: "text is required" }); return; }
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) { res.status(500).json({ message: "ElevenLabs API key not configured" }); return; }
      const trimmed = text.slice(0, 2500);
      const voiceId = "pNInz6obpgDQGcFmaJgB";
      const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
        body: JSON.stringify({ text: trimmed, model_id: "eleven_turbo_v2_5", voice_settings: { stability: 0.4, similarity_boost: 0.85, style: 0.2, use_speaker_boost: true } })
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
        name,
        amount: String(amount),
        dueDay: Number(dueDay),
        category: category || "Other",
        isVariable: !!isVariable,
        autopay: !!autopay,
        notes: notes || null,
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

  return httpServer;
}
