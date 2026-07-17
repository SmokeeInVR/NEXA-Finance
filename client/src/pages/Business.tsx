import { useMemo } from "react";
import { subDays } from "date-fns";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccountsWithBalances } from "@/hooks/use-accounts";
import { useBusinessExpenses, useBusinessIncome, useBusinessSettings } from "@/hooks/use-business";
import { usePlaidBalanceSummary, usePlaidTransactions, type PlaidTransaction } from "@/hooks/use-plaid";
import {
  BadgeDollarSign,
  Briefcase,
  Loader2,
  Receipt,
  Target,
  TrendingUp,
} from "lucide-react";

const BASELINE_WEEKLY_INSPECTION_INCOME = 670;
const BUSINESS_DEBT_FREE_DATE = new Date(2027, 0, 1);

function formatMoney(amount: number) {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizeMerchantName(transaction: PlaidTransaction) {
  return (transaction.merchantName || transaction.name || "Unknown")
    .replace(/\s+/g, " ")
    .trim();
}

function isPotentialBusinessExpense(transaction: PlaidTransaction) {
  if (transaction.amount <= 0) return false;
  const haystack = `${transaction.merchantName || ""} ${transaction.name || ""}`.toLowerCase();
  return /fuel|quiktrip|quicktrip|speedway|maverick|circle k|next insur|insurance|railway|openai|digitalocean|tool|enterprise/.test(
    haystack,
  );
}

function summarizeIncome(logs: Array<{ amount: string }>) {
  const total = logs.reduce((sum, log) => sum + parseFloat(log.amount), 0);
  const average = logs.length > 0 ? total / logs.length : 0;
  return { total, average };
}

export default function Business() {
  const { data: accounts, isLoading: accountsLoading } = useAccountsWithBalances();
  const { data: businessIncome = [], isLoading: incomeLoading } = useBusinessIncome();
  const { data: businessExpenses = [], isLoading: expensesLoading } = useBusinessExpenses();
  const { data: businessSettings, isLoading: settingsLoading } = useBusinessSettings();
  const { data: plaidSummary, isLoading: plaidSummaryLoading, error: plaidSummaryError } = usePlaidBalanceSummary();
  const { data: plaidTransactions, isLoading: plaidTransactionsLoading, error: plaidTransactionsError } = usePlaidTransactions(30);

  const isLoading =
    accountsLoading || incomeLoading || expensesLoading || settingsLoading || plaidSummaryLoading || plaidTransactionsLoading;

  const businessAccount = accounts?.find((account) => account.type === "business") || null;
  const taxSetAsideAccount = accounts?.find((account) => account.name === "Tax Set-Aside") || null;
  const houseFundAccount = accounts?.find((account) => account.name === "House Fund") || null;

  const incomeSummary = summarizeIncome(businessIncome);
  const baselineMonthlyIncome = BASELINE_WEEKLY_INSPECTION_INCOME * 4.33;
  const taxRate = parseFloat(businessSettings?.taxHoldPercent || "15") / 100;

  const loggedExpenseTotal = businessExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
  const averageExpense = businessExpenses.length > 0 ? loggedExpenseTotal / businessExpenses.length : 0;
  const estimatedQuarterlyTax = baselineMonthlyIncome * 3 * taxRate;
  const weeklySurplusPlan = 131;
  const postDebtWeeklyCapacity = 292;

  const possibleBusinessCharges = useMemo(
    () => (plaidTransactions?.transactions || []).filter(isPotentialBusinessExpense).slice(0, 10),
    [plaidTransactions],
  );

  const liveBusinessLikeSpend = possibleBusinessCharges.reduce((sum, transaction) => sum + transaction.amount, 0);
  const liveFuelSpend = possibleBusinessCharges
    .filter((transaction) => /fuel|quiktrip|quicktrip|speedway|maverick|circle k/.test(`${transaction.merchantName || ""} ${transaction.name || ""}`.toLowerCase()))
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const daysToDebtFree = Math.max(
    0,
    (BUSINESS_DEBT_FREE_DATE.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
  );
  const monthsToDebtFree = (daysToDebtFree / 30).toFixed(1);

  const recentIncomeWindowStart = subDays(new Date(), 90);
  const recentBusinessIncome = businessIncome.filter((entry) => new Date(entry.date) >= recentIncomeWindowStart);
  const recentIncomeSummary = summarizeIncome(recentBusinessIncome);
  const currentPlanningIncome = recentIncomeSummary.average > 0 ? recentIncomeSummary.average : BASELINE_WEEKLY_INSPECTION_INCOME;

  if (isLoading) {
    return (
      <Layout title="Business">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Business">
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card/70 p-4 shadow-lg">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">Business command center</p>
          <p className="mt-2 text-sm text-muted-foreground">
            This page now separates the live business picture from the planning layer. Linked-bank activity and your business ledger sit up front, while tax strategy and house-fund planning stay visible without pretending to be live cash.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-border bg-card shadow-lg">
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Business cash</p>
              <p className="mt-2 text-2xl font-bold font-mono text-success">${formatMoney(businessAccount?.currentBalance || 0)}</p>
              <p className="mt-1 text-xs text-muted-foreground">From the business ledger account</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card shadow-lg">
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tax set-aside</p>
              <p className="mt-2 text-2xl font-bold font-mono text-gold">${formatMoney(taxSetAsideAccount?.currentBalance || 0)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Current reserve bucket</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card shadow-lg">
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Logged business income</p>
              <p className="mt-2 text-2xl font-bold font-mono text-foreground">${formatMoney(incomeSummary.total)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Historical business income records</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card shadow-lg">
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Possible live business spend</p>
              <p className="mt-2 text-2xl font-bold font-mono text-foreground">${formatMoney(liveBusinessLikeSpend)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Last 30 days from linked-bank activity</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,1fr)]">
          <div className="space-y-6">
            <Card className="border-border bg-card shadow-2xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-border bg-secondary/20">
                <CardTitle className="text-lg flex items-center gap-2 text-gold">
                  <Briefcase className="w-5 h-5" /> Live operating picture
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
                  Current business cash, reserve position, and linked-bank context
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-success/30 bg-success/10 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-success">Business checking</p>
                    <p className="mt-2 text-xl font-bold font-mono text-success">${formatMoney(businessAccount?.currentBalance || 0)}</p>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-muted/15 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Connected checking</p>
                    <p className="mt-2 text-xl font-bold font-mono text-foreground">${formatMoney(plaidSummary?.totalChecking || 0)}</p>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-muted/15 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">House fund bucket</p>
                    <p className="mt-2 text-xl font-bold font-mono text-foreground">${formatMoney(houseFundAccount?.currentBalance || 0)}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">What this means</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The linked-bank totals tell us what cash exists right now. The business ledger tells us how much of that cash you are treating as inspection-business money. If those diverge, the Accounts page is where we reconcile the structure.
                  </p>
                </div>

                {(plaidSummaryError instanceof Error || plaidTransactionsError instanceof Error) && (
                  <div className="rounded-lg border border-soft-red/30 bg-soft-red/10 p-4 text-sm text-soft-red">
                    {(plaidSummaryError as Error | undefined)?.message || (plaidTransactionsError as Error | undefined)?.message}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-2xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-border bg-secondary/20">
                <CardTitle className="text-lg flex items-center gap-2 text-gold">
                  <Receipt className="w-5 h-5" /> Possible deductible charges
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
                  Live transactions that look like gas, tools, software, or insurance
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                {possibleBusinessCharges.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No likely business charges showed up in the linked-bank feed yet.</p>
                ) : (
                  possibleBusinessCharges.map((transaction) => (
                    <div key={transaction.transactionId} className="rounded-xl border border-border/60 bg-muted/15 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-semibold text-foreground truncate">{normalizeMerchantName(transaction)}</p>
                          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            {transaction.accountDisplayName || transaction.accountName || transaction.institutionName} • {transaction.date}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold font-mono text-foreground">${formatMoney(transaction.amount)}</p>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {transaction.pending ? "Pending" : "Posted"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-border bg-card shadow-2xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-border bg-secondary/20">
                <CardTitle className="text-lg flex items-center gap-2 text-gold">
                  <TrendingUp className="w-5 h-5" /> Income and pace
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
                  Logged business income first, planning baseline second
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="rounded-lg border border-border/50 bg-muted/15 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recent planning baseline</p>
                  <p className="mt-2 text-2xl font-bold font-mono text-success">${formatMoney(currentPlanningIncome)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {recentBusinessIncome.length > 0
                      ? "Average from recent logged business income entries"
                      : "Fallback baseline until more business income is logged"}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border/50 bg-muted/15 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Logged entries</p>
                    <p className="mt-2 text-xl font-bold font-mono text-foreground">{businessIncome.length}</p>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-muted/15 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Average entry</p>
                    <p className="mt-2 text-xl font-bold font-mono text-foreground">${formatMoney(incomeSummary.average)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-2xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-border bg-secondary/20">
                <CardTitle className="text-lg flex items-center gap-2 text-gold">
                  <BadgeDollarSign className="w-5 h-5" /> Tax and reserve strategy
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
                  Planning layer based on your configured tax hold percent
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-warning">Tax hold percent</p>
                    <p className="mt-2 text-2xl font-bold font-mono text-warning">{(taxRate * 100).toFixed(0)}%</p>
                  </div>
                  <div className="rounded-lg border border-border/50 bg-muted/15 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quarterly estimate</p>
                    <p className="mt-2 text-2xl font-bold font-mono text-foreground">${formatMoney(estimatedQuarterlyTax)}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/15 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Logged business expenses</p>
                  <p className="mt-2 text-xl font-bold font-mono text-foreground">${formatMoney(loggedExpenseTotal)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Average recorded business expense: ${formatMoney(averageExpense)}</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/15 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Live fuel-like charges</p>
                  <p className="mt-2 text-xl font-bold font-mono text-foreground">${formatMoney(liveFuelSpend)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">From linked-bank merchant matches over the last 30 days</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-2xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-border bg-secondary/20">
                <CardTitle className="text-lg flex items-center gap-2 text-gold">
                  <Target className="w-5 h-5" /> House fund capacity
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
                  Current versus debt-free planning lane
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="rounded-lg border border-border/50 bg-muted/15 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Current weekly house-fund pace</p>
                  <p className="mt-2 text-2xl font-bold font-mono text-foreground">${formatMoney(weeklySurplusPlan)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Current plan before debt freedom</p>
                </div>
                <div className="rounded-lg border border-success/30 bg-success/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-success">After debt-free target</p>
                  <p className="mt-2 text-2xl font-bold font-mono text-success">${formatMoney(postDebtWeeklyCapacity)}</p>
                  <p className="mt-1 text-xs text-success">Projected weekly pace once debt clears</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">
                    Debt-free target remains {BUSINESS_DEBT_FREE_DATE.toLocaleDateString()}. That is about {monthsToDebtFree} months away from today.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

