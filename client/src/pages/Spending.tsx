import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfWeek, endOfWeek, subDays } from "date-fns";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccountsWithBalances } from "@/hooks/use-accounts";
import { useTransactions, useCreateTransaction, useDeleteTransaction } from "@/hooks/use-transactions";
import { usePlaidBalanceSummary, usePlaidTransactions, type PlaidTransaction } from "@/hooks/use-plaid";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowDownRight,
  Building2,
  Fuel,
  Landmark,
  Loader2,
  Plus,
  Receipt,
  ShoppingCart,
  Trash2,
  Wallet,
} from "lucide-react";

const spendFormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  amount: z.string().min(1, "Amount is required"),
  category: z.string().min(1, "Category is required"),
  fromAccountId: z.string().min(1, "Account is required"),
  notes: z.string().optional(),
});

type SpendFormData = z.infer<typeof spendFormSchema>;

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

function inferSpendBucket(transaction: PlaidTransaction) {
  const haystack = `${transaction.merchantName || ""} ${transaction.name || ""}`.toLowerCase();

  if (/fry'?s fuel|fuel|quiktrip|quicktrip|speedway|circle k|maverick|qt/.test(haystack)) {
    return "Fuel";
  }
  if (/fry'?s food|walmart|costco|safeway/.test(haystack)) {
    return "Groceries";
  }
  if (/verizon|cox|apple\.com\/bill|google google one|playstation|openai|digitalocean|railway|elevenlabs/.test(haystack)) {
    return "Subscriptions";
  }
  if (/allstate|next insur|insurance/.test(haystack)) {
    return "Insurance";
  }
  if (/in n out|culver|canes|raising cane|dunkin|yogurtini/.test(haystack)) {
    return "Dining";
  }
  if (/rent|bilt|olympu|apartment/.test(haystack)) {
    return "Housing";
  }
  if (/capital one|discover|affirm|auto directpay|autopay|e-payment|wf credit card/.test(haystack)) {
    return "Debt";
  }
  if (/transfer|zelle|deposit|withdrawal|marcel govan|garcia-casillas|overland/.test(haystack)) {
    return "Transfers";
  }

  return "Other";
}

export default function Spending() {
  const { toast } = useToast();
  const { data: accounts, isLoading: accountsLoading } = useAccountsWithBalances();
  const { data: transactions, isLoading: transactionsLoading } = useTransactions({ type: "spend" });
  const { data: plaidSummary, isLoading: plaidSummaryLoading, error: plaidSummaryError } = usePlaidBalanceSummary();
  const { data: plaidTransactions, isLoading: plaidTransactionsLoading, error: plaidTransactionsError } = usePlaidTransactions(30);
  const createTransaction = useCreateTransaction();
  const deleteTransaction = useDeleteTransaction();

  const checkingAccounts = accounts?.filter((account) => ["personal", "spouse", "joint"].includes(account.type)) || [];
  const defaultAccountId = checkingAccounts.find((account) => account.type === "joint")?.id || checkingAccounts[0]?.id;

  const form = useForm<SpendFormData>({
    resolver: zodResolver(spendFormSchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      amount: "",
      category: "Household / Misc",
      fromAccountId: defaultAccountId?.toString() || "",
      notes: "",
    },
  });

  const onSubmit = async (data: SpendFormData) => {
    createTransaction.mutate(
      {
        date: data.date,
        type: "spend",
        amount: data.amount,
        fromAccountId: parseInt(data.fromAccountId, 10),
        category: data.category,
        notes: data.notes || undefined,
        createdBy: "Me",
      },
      {
        onSuccess: () => {
          form.reset({
            date: format(new Date(), "yyyy-MM-dd"),
            amount: "",
            category: "Household / Misc",
            fromAccountId: defaultAccountId?.toString() || "",
            notes: "",
          });
          toast({ title: "Spend logged" });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      },
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this entry?")) {
      deleteTransaction.mutate(id, {
        onSuccess: () => toast({ title: "Entry deleted" }),
        onError: () => toast({ title: "Error", description: "Failed to delete", variant: "destructive" }),
      });
    }
  };

  const isLoading = accountsLoading || transactionsLoading || plaidTransactionsLoading || plaidSummaryLoading;

  const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const liveExpenseTransactions = useMemo(
    () => (plaidTransactions?.transactions || []).filter((transaction) => transaction.amount > 0),
    [plaidTransactions],
  );
  const ledgerExpenseTransactions = transactions || [];

  const thisWeekLiveSpend = liveExpenseTransactions
    .filter((transaction) => {
      const date = new Date(transaction.date);
      return date >= thisWeekStart && date <= thisWeekEnd;
    })
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const last30LiveSpend = liveExpenseTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const pendingLiveCount = liveExpenseTransactions.filter((transaction) => transaction.pending).length;
  const manualThisWeekSpend = ledgerExpenseTransactions
    .filter((transaction) => {
      const date = new Date(transaction.date);
      return date >= thisWeekStart && date <= thisWeekEnd;
    })
    .reduce((sum, transaction) => sum + parseFloat(transaction.amount), 0);

  const topBuckets = Object.entries(
    liveExpenseTransactions.reduce<Record<string, number>>((acc, transaction) => {
      const bucket = inferSpendBucket(transaction);
      acc[bucket] = (acc[bucket] || 0) + transaction.amount;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topMerchants = Object.entries(
    liveExpenseTransactions.reduce<Record<string, number>>((acc, transaction) => {
      const merchant = normalizeMerchantName(transaction);
      acc[merchant] = (acc[merchant] || 0) + transaction.amount;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const recentLiveTransactions = liveExpenseTransactions.slice(0, 12);
  const recentLedgerTransactions = ledgerExpenseTransactions.slice(0, 12);

  const checkingLedgerCash = checkingAccounts.reduce((sum, account) => sum + account.currentBalance, 0);
  const connectedChecking = plaidSummary?.totalChecking || 0;
  const discrepancy = connectedChecking - checkingLedgerCash;

  const getAccountName = (accountId: number | null) => {
    if (!accountId) return "Unknown";
    return accounts?.find((account) => account.id === accountId)?.name || "Unknown";
  };

  if (isLoading) {
    return (
      <Layout title="Spending">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Spending">
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card/70 p-4 shadow-lg">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">Spending hub</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Live connected-bank spending comes first here. Manual ledger spending is still available, but it now lives as the second layer so this tab reads more like a real money app and less like a form wall.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-border bg-card shadow-lg">
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Live 30-day spend</p>
              <p className="mt-2 text-2xl font-bold font-mono text-gold">${formatMoney(last30LiveSpend)}</p>
              <p className="mt-1 text-xs text-muted-foreground">From connected bank and card activity</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card shadow-lg">
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Live this week</p>
              <p className="mt-2 text-2xl font-bold font-mono text-foreground">${formatMoney(thisWeekLiveSpend)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Current week bank activity</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card shadow-lg">
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pending charges</p>
              <p className="mt-2 text-2xl font-bold font-mono text-foreground">{pendingLiveCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Still settling at the bank</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card shadow-lg">
            <CardContent className="p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Checking cash</p>
              <p className="mt-2 text-2xl font-bold font-mono text-success">${formatMoney(connectedChecking)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Connected checking total right now</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
          <div className="space-y-6">
            <Card className="border-border bg-card shadow-2xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-border bg-secondary/20">
                <CardTitle className="text-lg flex items-center gap-2 text-gold">
                  <Landmark className="w-5 h-5" /> Live transaction feed
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
                  Real activity from linked accounts over the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {plaidTransactionsError instanceof Error ? (
                  <div className="rounded-lg border border-soft-red/30 bg-soft-red/10 p-4 text-sm text-soft-red">
                    {plaidTransactionsError.message}
                  </div>
                ) : recentLiveTransactions.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                    No connected spend transactions were returned yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentLiveTransactions.map((transaction) => {
                      const bucket = inferSpendBucket(transaction);
                      return (
                        <div
                          key={transaction.transactionId}
                          className="rounded-xl border border-border/60 bg-muted/15 p-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 text-foreground">
                                <span className="text-sm font-semibold truncate">{normalizeMerchantName(transaction)}</span>
                                {transaction.pending && (
                                  <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-gold">
                                    Pending
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                                {bucket} • {transaction.accountDisplayName || transaction.accountName || transaction.institutionName} • {transaction.date}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-lg font-bold font-mono text-foreground">${formatMoney(transaction.amount)}</p>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                {transaction.category || "Bank feed"}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <details className="group rounded-2xl border border-border bg-card/70 shadow-lg" open>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
                <span>Manual ledger spending tools</span>
                <span className="text-gold group-open:hidden">Show</span>
                <span className="hidden text-gold group-open:inline">Hide</span>
              </summary>
              <div className="space-y-6 px-4 pb-4">
                <Card className="border-border bg-card shadow-lg">
                  <CardHeader className="pb-3 border-b border-border bg-secondary/20">
                    <CardTitle className="text-lg flex items-center gap-2 text-gold">
                      <Plus className="w-5 h-5" /> Log ledger spending
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
                      Use this when you need manual categories or notes beyond the bank feed
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Date</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} className="h-11 rounded-xl bg-secondary border-border text-foreground" data-testid="input-date" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Amount</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder="0.00" {...field} className="h-11 rounded-xl bg-secondary border-border text-gold font-bold text-lg" data-testid="input-amount" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="fromAccountId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Pay from</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="bg-secondary border-border h-11 rounded-xl text-foreground" data-testid="select-account">
                                      <SelectValue placeholder="Select account" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="bg-popover border-popover-border">
                                    {checkingAccounts.map((account) => (
                                      <SelectItem key={account.id} value={account.id.toString()}>
                                        {account.name} (${account.currentBalance.toFixed(2)})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Category</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="bg-secondary border-border h-11 rounded-xl text-foreground" data-testid="select-category">
                                      <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="bg-popover border-popover-border">
                                    <SelectItem value="Groceries">Groceries</SelectItem>
                                    <SelectItem value="Gas / Fuel">Gas / Fuel</SelectItem>
                                    <SelectItem value="Personal (Me)">Personal (Me)</SelectItem>
                                    <SelectItem value="Personal (Spouse)">Personal (Spouse)</SelectItem>
                                    <SelectItem value="Household / Misc">Household / Misc</SelectItem>
                                    <SelectItem value="Dining Out">Dining Out</SelectItem>
                                    <SelectItem value="Entertainment">Entertainment</SelectItem>
                                    <SelectItem value="Subscriptions">Subscriptions</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Notes</FormLabel>
                              <FormControl>
                                <Input placeholder="Extra details..." {...field} className="h-11 rounded-xl bg-secondary border-border text-foreground" data-testid="input-notes" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:opacity-90 transition-opacity" disabled={createTransaction.isPending} data-testid="btn-submit">
                          {createTransaction.isPending ? "Saving..." : "Save ledger spend"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card shadow-lg">
                  <CardHeader className="pb-3 border-b border-border bg-secondary/20">
                    <CardTitle className="text-lg flex items-center gap-2 text-gold">
                      <Receipt className="w-5 h-5" /> Manual ledger entries
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
                      Your categorized ledger view for spending plans and reviews
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3">
                    {recentLedgerTransactions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No manual ledger spending logged yet.</p>
                    ) : (
                      recentLedgerTransactions.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/15 p-4" data-testid={`spending-entry-${entry.id}`}>
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">{entry.category || "Uncategorized"}</span>
                              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                {getAccountName(entry.fromAccountId)}
                              </span>
                            </div>
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{format(new Date(entry.date), "MMM d, yyyy")}</p>
                            {entry.notes && <p className="text-xs italic text-muted-foreground">“{entry.notes}”</p>}
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <span className="font-mono font-bold text-lg text-gold">${formatMoney(parseFloat(entry.amount))}</span>
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5" onClick={() => handleDelete(entry.id)} data-testid={`btn-delete-${entry.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </details>
          </div>

          <div className="space-y-6">
            <Card className="border-border bg-card shadow-2xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-border bg-secondary/20">
                <CardTitle className="text-lg flex items-center gap-2 text-gold">
                  <ShoppingCart className="w-5 h-5" /> Where the money is going
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
                  Live 30-day spend grouped into finance buckets
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                {topBuckets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No live spend buckets yet.</p>
                ) : (
                  topBuckets.map(([bucket, amount]) => (
                    <div key={bucket} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/15 p-3">
                      <div className="flex items-center gap-2">
                        {bucket === "Fuel" ? <Fuel className="w-4 h-4 text-gold" /> : <ArrowDownRight className="w-4 h-4 text-gold" />}
                        <span className="text-sm font-medium text-foreground">{bucket}</span>
                      </div>
                      <span className="font-mono font-bold text-foreground">${formatMoney(amount)}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-2xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-border bg-secondary/20">
                <CardTitle className="text-lg flex items-center gap-2 text-gold">
                  <Building2 className="w-5 h-5" /> Spending context
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
                  Live cash versus manual ledger totals
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="rounded-lg border border-border/50 bg-muted/15 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Connected checking cash</p>
                  <p className="mt-2 text-2xl font-bold font-mono text-success">${formatMoney(connectedChecking)}</p>
                  {plaidSummary?.lastUpdated && (
                    <p className="mt-1 text-[11px] text-muted-foreground">Updated {new Date(plaidSummary.lastUpdated).toLocaleString()}</p>
                  )}
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/15 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ledger checking total</p>
                  <p className="mt-2 text-2xl font-bold font-mono text-foreground">${formatMoney(checkingLedgerCash)}</p>
                  <p className={`mt-1 text-[11px] ${Math.abs(discrepancy) < 0.01 ? "text-success" : "text-gold"}`}>
                    {Math.abs(discrepancy) < 0.01 ? "Ledger and live bank cash are aligned." : `Difference vs live bank cash: ${discrepancy >= 0 ? "+" : "-"}$${formatMoney(Math.abs(discrepancy))}`}
                  </p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Top live merchants</p>
                  <div className="mt-3 space-y-2">
                    {topMerchants.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No merchant data yet.</p>
                    ) : (
                      topMerchants.map(([merchant, amount]) => (
                        <div key={merchant} className="flex items-center justify-between text-sm">
                          <span className="text-foreground truncate pr-4">{merchant}</span>
                          <span className="font-mono font-bold text-foreground">${formatMoney(amount)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                {(plaidSummaryError instanceof Error || plaidTransactionsError instanceof Error) && (
                  <div className="rounded-lg border border-soft-red/30 bg-soft-red/10 p-4 text-sm text-soft-red">
                    {(plaidSummaryError as Error | undefined)?.message || (plaidTransactionsError as Error | undefined)?.message}
                  </div>
                )}
                <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
                  <p className="text-xs text-muted-foreground">
                    Live bank activity is the truth layer. Manual ledger entries are still useful for budgeting and custom categories, but they should not override what the connected accounts say happened.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-lg">
              <CardHeader className="pb-3 border-b border-border bg-secondary/20">
                <CardTitle className="text-lg flex items-center gap-2 text-gold">
                  <Wallet className="w-5 h-5" /> Manual vs live this week
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/50 bg-muted/15 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Live bank spend</p>
                  <p className="mt-2 text-xl font-bold font-mono text-foreground">${formatMoney(thisWeekLiveSpend)}</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/15 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Manual ledger spend</p>
                  <p className="mt-2 text-xl font-bold font-mono text-foreground">${formatMoney(manualThisWeekSpend)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

