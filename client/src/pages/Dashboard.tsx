import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useBudgetSettings, useUpdateBudgetSettings } from "@/hooks/use-budget";
import { useDebts } from "@/hooks/use-debts";
import { useAccountsWithBalances } from "@/hooks/use-accounts";
import { useCreateTransaction, useTransactions } from "@/hooks/use-transactions";
import { insertBudgetSettingsSchema, type InsertBudgetSettings, type WeeklyIncomeLog, type AccountBalance, type SpendingLog, type BillsFundingLog, type WeeklyCashSnapshot } from "@shared/schema";
import { Switch } from "@/components/ui/switch";
import { Loader2, TrendingUp, Wallet, ArrowRightLeft, PieChart, Save, Receipt, DollarSign, Check, Trash2, Plus, X } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { startOfWeek, endOfWeek, isWithinInterval, startOfMonth, format, differenceInCalendarWeeks } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Dashboard() {
  const { data: settings, isLoading: isSettingsLoading } = useBudgetSettings();
  const updateSettings = useUpdateBudgetSettings();
  const { data: debts } = useDebts();
  const { toast } = useToast();

  const { data: incomeLogs, isLoading: isLogsLoading } = useQuery<WeeklyIncomeLog[]>({
    queryKey: ["/api/income"],
  });

  const { data: latestIncomeResponse, isLoading: isLatestLoading, refetch: refetchLatest } = useQuery<{
    weekStartDate: string;
    myIncome: number;
    spouseIncome: number;
    totalWeeklyIncome: number;
    updatedAt: string;
  } | null>({
    queryKey: ["/api/income/latest"],
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 1000,
    retry: true,
  });

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refetchLatest();
    };
    const handleFocus = () => refetchLatest();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetchLatest]);

  const { data: spendingLogs, isLoading: isSpendingLoading } = useQuery<SpendingLog[]>({
    queryKey: ["/api/spending"],
  });

  const { data: balances } = useQuery<AccountBalance[]>({
    queryKey: ["/api/balances"],
  });

  const { data: billsFundingLogs } = useQuery<BillsFundingLog[]>({
    queryKey: ["/api/bills-funding"],
  });

  const { data: ledgerAccounts } = useAccountsWithBalances();
  const createTransaction = useCreateTransaction();
  const { data: ledgerTransactions } = useTransactions();

  const [billsMyTransfer, setBillsMyTransfer] = useState("");
  const [billsSpouseTransfer, setBillsSpouseTransfer] = useState("");
  const [billsNote, setBillsNote] = useState("");

  // === INCOME MODAL STATE ===
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [incomeMyAmount, setIncomeMyAmount] = useState("");
  const [incomeSpouseAmount, setIncomeSpouseAmount] = useState("");
  const [incomeDepositEnabled, setIncomeDepositEnabled] = useState(true);
  const [myDepositAccountId, setMyDepositAccountId] = useState<string>("");
  const [spouseDepositAccountId, setSpouseDepositAccountId] = useState<string>("");

  const weekStartForModal = startOfWeek(new Date(), { weekStartsOn: 1 });
  const currentWeekStartDateForModal = format(weekStartForModal, "yyyy-MM-dd");

  const saveIncomeMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/income", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/income"] });
      queryClient.invalidateQueries({ queryKey: ["/api/income/latest"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts/with-balances"] });
      setShowIncomeModal(false);
      setIncomeMyAmount("");
      setIncomeSpouseAmount("");
      toast({ title: "Income logged!", description: "Weekly income saved successfully." });
    },
    onError: () => {
      toast({ title: "Error saving income", variant: "destructive" });
    }
  });

  const handleSaveIncome = () => {
    saveIncomeMutation.mutate({
      weekStartDate: currentWeekStartDateForModal,
      myIncome: incomeMyAmount || "0",
      spouseIncome: incomeSpouseAmount || "0",
      deposited: incomeDepositEnabled,
      myDepositAccountId: myDepositAccountId ? parseInt(myDepositAccountId) : null,
      spouseDepositAccountId: spouseDepositAccountId ? parseInt(spouseDepositAccountId) : null,
    });
  };

  const saveBillsFunding = useMutation({
    mutationFn: async (data: { weekStartDate: string; myTransfer: string; spouseTransfer: string; note?: string }) => {
      const res = await apiRequest("POST", "/api/bills-funding", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills-funding"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts/with-balances"] });
      toast({ title: "Saved", description: "Bills funding logged. Account balances updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
    }
  });

  const deleteBillsFunding = useMutation({
    mutationFn: async (weekStartDate: string) => {
      await apiRequest("DELETE", `/api/bills-funding/${weekStartDate}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills-funding"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts/with-balances"] });
      setBillsMyTransfer("");
      setBillsSpouseTransfer("");
      setBillsNote("");
      toast({ title: "Reset", description: "Bills funding entry cleared." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to reset", variant: "destructive" });
    }
  });

  const form = useForm<InsertBudgetSettings>({
    resolver: zodResolver(insertBudgetSettingsSchema),
    defaultValues: {
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
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        ...settings,
        monthlyFixedBills: settings.monthlyFixedBills.toString(),
        splitMode: (settings.splitMode as any) || "AUTO",
        mySplitPct: settings.mySplitPct.toString(),
        spouseSplitPct: settings.spouseSplitPct.toString(),
        savingsMode: (settings.savingsMode as any) || "PERCENT",
        savingsValue: settings.savingsValue.toString(),
        investingMode: (settings.investingMode as any) || "PERCENT",
        investingValue: settings.investingValue.toString(),
        debtBufferMode: (settings.debtBufferMode as any) || "PERCENT",
        debtBufferValue: settings.debtBufferValue.toString(),
        tradingMode: (settings.tradingMode as any) || "PERCENT",
        tradingValue: settings.tradingValue.toString(),
        allocationFrequency: (settings.allocationFrequency as any) || "MONTHLY",
        incomeSource: (settings.incomeSource as any) || "MANUAL",
        avgWindowWeeks: settings.avgWindowWeeks || 4,
        bufferGoalAmount: settings.bufferGoalAmount?.toString() || "1000",
        bufferRerouteEnabled: !!settings.bufferRerouteEnabled,
        rerouteTarget: (settings.rerouteTarget as any) || "SAVINGS",
      });
    }
  }, [settings, form]);

  const weekStartForFunding = startOfWeek(new Date(), { weekStartsOn: 1 });
  const currentWeekStartDateForFunding = format(weekStartForFunding, "yyyy-MM-dd");
  const currentWeekFundingData = billsFundingLogs?.find(l => l.weekStartDate === currentWeekStartDateForFunding);

  useEffect(() => {
    if (currentWeekFundingData) {
      if (billsMyTransfer === "" && billsSpouseTransfer === "") {
        setBillsMyTransfer(currentWeekFundingData.myTransfer);
        setBillsSpouseTransfer(currentWeekFundingData.spouseTransfer);
        setBillsNote(currentWeekFundingData.note || "");
      }
    }
  }, [currentWeekFundingData]);

  // Pre-select deposit accounts when modal opens
  useEffect(() => {
    if (showIncomeModal && ledgerAccounts) {
      const personalAccount = ledgerAccounts.find(a => a.type === "personal");
      const spouseAccount = ledgerAccounts.find(a => a.type === "spouse");
      if (personalAccount && !myDepositAccountId) setMyDepositAccountId(String(personalAccount.id));
      if (spouseAccount && !spouseDepositAccountId) setSpouseDepositAccountId(String(spouseAccount.id));
    }
  }, [showIncomeModal, ledgerAccounts]);

  if (isSettingsLoading || isLogsLoading || isSpendingLoading || isLatestLoading) {
    return (
      <Layout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const weeklyMe = parseFloat(String(latestIncomeResponse?.myIncome ?? 0));
  const weeklySpouse = parseFloat(String(latestIncomeResponse?.spouseIncome ?? 0));
  const totalWeeklyIncome = parseFloat(String(latestIncomeResponse?.totalWeeklyIncome ?? 0));
  const hasIncomeThisWeek = totalWeeklyIncome > 0;

  const splitMode = form.watch("splitMode");
  const activeMyPct = splitMode === "AUTO" && totalWeeklyIncome > 0
    ? (weeklyMe / totalWeeklyIncome) * 100
    : parseFloat(form.watch("mySplitPct") || "50");
  const activeSpousePct = 100 - activeMyPct;

  const monthlyFixed = parseFloat(form.watch("monthlyFixedBills") || "0");
  const weeklyFixed = monthlyFixed / 4.33;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const currentWeekStartDate = format(weekStart, "yyyy-MM-dd");
  const monthStart = startOfMonth(new Date());
  const currentWeekFunding = currentWeekFundingData;

  const actualWeeklyContributions = currentWeekFunding
    ? parseFloat(currentWeekFunding.myTransfer) + parseFloat(currentWeekFunding.spouseTransfer)
    : 0;

  const currentWeekLedgerSpending = (ledgerTransactions || [])
    .filter(tx => tx.type === "spend" && isWithinInterval(new Date(tx.date), { start: weekStart, end: weekEnd }));
  const totalWeeklySpent = currentWeekLedgerSpending.reduce((acc, tx) => acc + parseFloat(tx.amount), 0);
  const hasSpendingThisWeek = totalWeeklySpent > 0 || currentWeekLedgerSpending.length > 0;
  const remainingThisWeek = totalWeeklyIncome - actualWeeklyContributions - totalWeeklySpent;

  const today = new Date();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const firstMondayOfMonth = startOfWeek(monthStart, { weekStartsOn: 1 });
  const adjustedFirstMonday = firstMondayOfMonth < monthStart
    ? new Date(firstMondayOfMonth.getTime() + 7 * 24 * 60 * 60 * 1000)
    : firstMondayOfMonth;
  const weeksElapsedThisMonth = currentWeekStart >= adjustedFirstMonday
    ? Math.max(1, differenceInCalendarWeeks(currentWeekStart, adjustedFirstMonday, { weekStartsOn: 1 }) + 1)
    : 0;
  const adjustedFirstMondayStr = format(adjustedFirstMonday, "yyyy-MM-dd");
  const currentWeekStartStr = format(currentWeekStart, "yyyy-MM-dd");
  const mtdLogs = (billsFundingLogs || []).filter(l => {
    return l.weekStartDate >= adjustedFirstMondayStr && l.weekStartDate <= currentWeekStartStr;
  });
  const mtdTarget = weeklyFixed * weeksElapsedThisMonth;
  const mtdFunded = mtdLogs.reduce((acc, l) => acc + parseFloat(l.myTransfer) + parseFloat(l.spouseTransfer), 0);
  const mtdDifference = mtdFunded - mtdTarget;
  const logsThisMonth = mtdLogs.length;

  const myWeeklyTarget = weeklyFixed * (activeMyPct / 100);
  const spouseWeeklyTarget = weeklyFixed * (activeSpousePct / 100);
  const currentMyActual = currentWeekFunding ? parseFloat(currentWeekFunding.myTransfer) : parseFloat(billsMyTransfer || "0");
  const currentSpouseActual = currentWeekFunding ? parseFloat(currentWeekFunding.spouseTransfer) : parseFloat(billsSpouseTransfer || "0");

  const handleSaveBillsFunding = async () => {
    saveBillsFunding.mutate({
      weekStartDate: currentWeekStartDate,
      myTransfer: billsMyTransfer || "0",
      spouseTransfer: billsSpouseTransfer || "0",
      note: billsNote || undefined,
    });
  };

  const weeklyMargin = totalWeeklyIncome - actualWeeklyContributions;
  const monthlyMargin = weeklyMargin * 4.33;
  const allocationFrequency = (form.watch("allocationFrequency") as "MONTHLY" | "WEEKLY") || "MONTHLY";
  const allocatable = allocationFrequency === "MONTHLY" ? monthlyMargin : weeklyMargin;

  const getBucketAmount = (mode: "PERCENT" | "FIXED", valueStr: string) => {
    const val = parseFloat(valueStr || "0");
    return mode === "PERCENT" ? allocatable * (val / 100) : val;
  };

  const bucketSavings = getBucketAmount((form.watch("savingsMode") as any) || "PERCENT", form.watch("savingsValue") || "0");
  const bucketInvesting = getBucketAmount((form.watch("investingMode") as any) || "PERCENT", form.watch("investingValue") || "0");
  const bucketDebt = getBucketAmount((form.watch("debtBufferMode") as any) || "PERCENT", form.watch("debtBufferValue") || "0");
  const bucketTrading = getBucketAmount((form.watch("tradingMode") as any) || "PERCENT", form.watch("tradingValue") || "0");
  const totalAllocated = bucketSavings + bucketInvesting + bucketDebt + bucketTrading;

  const personalAccounts = ledgerAccounts?.filter(a => ["personal", "spouse", "joint", "bucket"].includes(a.type) && !a.excludeFromTotals) || [];

  return (
    <Layout title="Dashboard">
      <div className="space-y-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border bg-card shadow-lg">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Wallet className="w-4 h-4 text-gold" /> Weekly Income
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {hasIncomeThisWeek ? (
                <div className="text-2xl font-bold font-display tracking-tight text-foreground">
                  ${totalWeeklyIncome.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">Not logged</p>
                  <button
                    onClick={() => setShowIncomeModal(true)}
                    className="text-xs text-gold underline mt-0.5"
                  >
                    Log now
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-lg">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gold" /> Weekly Margin
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {hasIncomeThisWeek ? (
                <div className={`text-2xl font-bold font-display tracking-tight ${weeklyMargin >= 0 ? 'text-success' : 'text-soft-red'}`}>
                  ${weeklyMargin.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Weekly Spending */}
        <Card className="border-border bg-card shadow-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-secondary/20">
            <CardTitle className="text-lg flex items-center gap-2 text-gold">
              <Receipt className="w-5 h-5" /> Weekly Spending
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Current week status</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {hasIncomeThisWeek ? (
              <>
                <div className="flex justify-between items-end border-b pb-4 border-border">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Remaining This Week</Label>
                    <p className={`text-3xl font-bold font-display ${remainingThisWeek >= 0 ? 'text-success' : 'text-soft-red'}`}>
                      ${Math.abs(remainingThisWeek).toFixed(2)}
                      <span className="text-xs ml-1 font-bold">{remainingThisWeek >= 0 ? 'Left' : 'Over'}</span>
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Spent</Label>
                    <p className="text-lg font-bold font-mono text-foreground">${totalWeeklySpent.toFixed(2)}</p>
                  </div>
                </div>
                {hasSpendingThisWeek ? (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    {[
                      { label: "Groceries", amount: currentWeekLedgerSpending.filter(s => s.category === "Groceries").reduce((acc, s) => acc + parseFloat(s.amount), 0) },
                      { label: "Gas / Fuel", amount: currentWeekLedgerSpending.filter(s => s.category === "Gas / Fuel").reduce((acc, s) => acc + parseFloat(s.amount), 0) },
                      { label: "Personal", amount: currentWeekLedgerSpending.filter(s => ["Personal (Me)", "Personal (Spouse)"].includes(s.category || "")).reduce((acc, s) => acc + parseFloat(s.amount), 0) },
                      { label: "Household", amount: currentWeekLedgerSpending.filter(s => s.category === "Household / Misc").reduce((acc, s) => acc + parseFloat(s.amount), 0) },
                    ].filter(cat => cat.amount > 0).map((cat) => (
                      <div key={cat.label} className="flex justify-between items-center">
                        <span className="text-sm text-foreground font-medium">{cat.label}</span>
                        <span className="text-sm font-bold font-mono text-gold">${cat.amount.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">No spending logged this week yet</p>
                )}
              </>
            ) : (
              <div className="text-center py-4 space-y-2">
                <p className="text-sm text-muted-foreground">Log this week's income to see your spending margin</p>
                <Button size="sm" variant="outline" onClick={() => setShowIncomeModal(true)} className="border-gold/50 text-gold">
                  Log Income
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Balances Snapshot */}
        <Card className="border-border bg-card shadow-lg">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Wallet className="w-4 h-4 text-gold" /> Balances Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2">
            {(() => {
              const snapshotTypes = ["personal", "spouse", "joint"];
              const checkingAccounts = ledgerAccounts?.filter(a => snapshotTypes.includes(a.type)) || [];
              const bucketAccounts = ledgerAccounts?.filter(a =>
                a.type === "bucket" &&
                !a.excludeFromTotals &&
                !["Tax Set-Aside", "Trading Funds"].includes(a.name)
              ) || [];
              const taxesAccount = ledgerAccounts?.find(a => a.name === "Tax Set-Aside");
              const tradingAccount = ledgerAccounts?.find(a => a.name === "Trading Funds");
              const totalChecking = checkingAccounts.reduce((acc, a) => acc + a.currentBalance, 0);
              const totalBuckets = bucketAccounts.reduce((acc, a) => acc + a.currentBalance, 0);
              const totalCash = totalChecking + totalBuckets;
              return (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {checkingAccounts.map((account) => (
                      <div key={account.id} className="flex justify-between items-center py-1">
                        <span className="text-xs text-muted-foreground truncate">{account.name}</span>
                        <span className="text-sm font-mono font-bold text-foreground">
                          ${account.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    ))}
                  </div>
                  {bucketAccounts.length > 0 && (
                    <div className="pt-1 border-t border-border grid grid-cols-2 gap-2">
                      {bucketAccounts.map((account) => (
                        <div key={account.id} className="flex justify-between items-center py-1">
                          <span className="text-xs text-muted-foreground truncate">{account.name}</span>
                          <span className="text-sm font-mono font-bold text-foreground">
                            ${account.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {taxesAccount && (
                    <div className="flex justify-between items-center py-1 border-t border-border pt-2">
                      <span className="text-xs text-muted-foreground">Taxes Set-Aside</span>
                      <span className="text-sm font-mono font-bold text-amber-500">
                        ${taxesAccount.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2 border-t border-border mt-2">
                    <span className="text-sm font-bold text-foreground">Total Cash</span>
                    <span className="text-lg font-mono font-bold text-gold">
                      ${totalCash.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  {tradingAccount && (
                    <div className="flex justify-between items-center py-1 text-muted-foreground">
                      <span className="text-[10px] uppercase tracking-widest">Trading (separate)</span>
                      <span className="text-xs font-mono">
                        ${tradingAccount.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>

        {/* Bills Funding Tracker */}
        <Card className="border-border bg-card shadow-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-secondary/20">
            <CardTitle className="text-lg flex items-center gap-2 text-gold">
              <DollarSign className="w-5 h-5" /> Bills Funding
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
              Weekly transfers to Joint Bills
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-5">
            <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Monthly Bills</span>
                <span className="text-sm font-bold font-mono text-foreground">${monthlyFixed.toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Weekly Target</span>
                <span className="text-lg font-bold font-mono text-gold">${weeklyFixed.toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Me ({activeMyPct.toFixed(0)}%)</p>
                  <p className="text-sm font-mono font-bold text-foreground">${myWeeklyTarget.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Spouse ({activeSpousePct.toFixed(0)}%)</p>
                  <p className="text-sm font-mono font-bold text-foreground">${spouseWeeklyTarget.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                  Log Week of {format(weekStart, "MMM d")}
                </Label>
                {currentWeekFunding && (
                  <span className="text-[10px] uppercase font-bold text-success flex items-center gap-1">
                    <Check className="w-3 h-3" /> Logged
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-widest">My Transfer</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={billsMyTransfer}
                      onChange={(e) => setBillsMyTransfer(e.target.value)}
                      className="h-9 font-mono bg-secondary border-border"
                      placeholder={myWeeklyTarget.toFixed(0)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-widest">Spouse Transfer</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={billsSpouseTransfer}
                      onChange={(e) => setBillsSpouseTransfer(e.target.value)}
                      className="h-9 font-mono bg-secondary border-border"
                      placeholder={spouseWeeklyTarget.toFixed(0)}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleSaveBillsFunding}
                  disabled={saveBillsFunding.isPending}
                >
                  {saveBillsFunding.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                  {currentWeekFunding ? "Update" : "Save"}
                </Button>
                {currentWeekFunding && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-destructive/50 text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm("Reset this week's bills funding entry?")) {
                        deleteBillsFunding.mutate(currentWeekStartDate);
                      }
                    }}
                    disabled={deleteBillsFunding.isPending}
                  >
                    {deleteBillsFunding.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                )}
              </div>
            </div>

            {currentWeekFunding && (
              <div className="bg-secondary/20 rounded-xl p-4 space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Suggested vs Actual</Label>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase">Me</p>
                    <p className="font-mono">
                      <span className="text-muted-foreground">${myWeeklyTarget.toFixed(0)}</span>
                      <span className="text-muted-foreground mx-1">/</span>
                      <span className={currentMyActual >= myWeeklyTarget ? "text-success font-bold" : "text-gold font-bold"}>
                        ${currentMyActual.toFixed(0)}
                      </span>
                    </p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] text-muted-foreground uppercase">Spouse</p>
                    <p className="font-mono">
                      <span className="text-muted-foreground">${spouseWeeklyTarget.toFixed(0)}</span>
                      <span className="text-muted-foreground mx-1">/</span>
                      <span className={currentSpouseActual >= spouseWeeklyTarget ? "text-success font-bold" : "text-gold font-bold"}>
                        ${currentSpouseActual.toFixed(0)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t border-border pt-4 space-y-3">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Month-to-Date</Label>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Target</p>
                  <p className="font-mono font-bold text-sm text-foreground">${mtdTarget.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Funded</p>
                  <p className="font-mono font-bold text-sm text-foreground">${mtdFunded.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                    {mtdDifference >= 0 ? "Ahead" : "Behind"}
                  </p>
                  <p className={`font-mono font-bold text-sm ${mtdDifference >= 0 ? "text-success" : "text-soft-red"}`}>
                    {mtdDifference >= 0 ? "+" : ""}${mtdDifference.toFixed(0)}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                {logsThisMonth} of {weeksElapsedThisMonth} week{weeksElapsedThisMonth !== 1 ? "s" : ""} logged
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Bucket Plan */}
        <Card className="border-border bg-card shadow-2xl">
          <CardHeader className="pb-3 border-b border-border bg-secondary/20">
            <CardTitle className="text-lg flex items-center gap-2 text-gold">
              <PieChart className="w-5 h-5" /> Bucket Plan
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Monthly Margin Allocation</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {hasIncomeThisWeek ? (
              <div className="space-y-4">
                {[
                  { label: "Savings", amount: bucketSavings },
                  { label: "Investing", amount: bucketInvesting },
                  { label: "Debt + Buffer", amount: bucketDebt },
                  { label: "Trading", amount: bucketTrading },
                ].map((bucket) => (
                  <div key={bucket.label} className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{bucket.label}</Label>
                    <span className="text-sm font-bold font-mono text-foreground">${bucket.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="pt-4 border-t border-border flex justify-between items-center">
                  <span className="text-sm font-bold text-foreground">Total</span>
                  <span className="text-lg font-bold font-mono text-gold">${totalAllocated.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 space-y-2">
                <p className="text-sm text-muted-foreground">Log income to see your bucket allocations</p>
                <Button size="sm" variant="outline" onClick={() => setShowIncomeModal(true)} className="border-gold/50 text-gold">
                  Log Income
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowIncomeModal(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-gold rounded-full shadow-lg flex items-center justify-center z-40 hover:bg-gold/90 transition-all active:scale-95"
      >
        <Plus className="w-6 h-6 text-black" />
      </button>

      {/* Income Modal */}
      {showIncomeModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center overflow-hidden">
  <div className="bg-background border-t border-border rounded-t-2xl w-full max-w-md px-6 pt-6 pb-24 space-y-4 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Log Weekly Income</h2>
              <button onClick={() => setShowIncomeModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Week of {format(weekStartForModal, "MMM d, yyyy")}</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-widest">My Income</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={incomeMyAmount}
                    onChange={(e) => setIncomeMyAmount(e.target.value)}
                    className="pl-7 bg-secondary border-border"
                    placeholder="0"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-widest">Spouse Income</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={incomeSpouseAmount}
                    onChange={(e) => setIncomeSpouseAmount(e.target.value)}
                    className="pl-7 bg-secondary border-border"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-foreground">Deposit to Accounts</Label>
                <p className="text-xs text-muted-foreground">Add income to account balances</p>
              </div>
              <Switch checked={incomeDepositEnabled} onCheckedChange={setIncomeDepositEnabled} />
            </div>

            {incomeDepositEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-widest">My Deposit Into</Label>
                  <Select value={myDepositAccountId} onValueChange={setMyDepositAccountId}>
                    <SelectTrigger className="mt-1 bg-secondary border-border">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {personalAccounts.map(a => (
                        <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-widest">Spouse Deposit Into</Label>
                  <Select value={spouseDepositAccountId} onValueChange={setSpouseDepositAccountId}>
                    <SelectTrigger className="mt-1 bg-secondary border-border">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {personalAccounts.map(a => (
                        <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <Button
              className="w-full bg-gold hover:bg-gold/90 text-black font-bold"
              onClick={handleSaveIncome}
              disabled={saveIncomeMutation.isPending}
            >
              {saveIncomeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save & Deposit
            </Button>
          </div>
        </div>
      )}
    </Layout>
  );
}
