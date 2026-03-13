import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useBudgetSettings } from "@/hooks/use-budget";
import { useAccountsWithBalances } from "@/hooks/use-accounts";
import { useTransactions } from "@/hooks/use-transactions";
import { insertBudgetSettingsSchema, type InsertBudgetSettings, type WeeklyIncomeLog, type AccountBalance, type SpendingLog, type BillsFundingLog } from "@shared/schema";
import { Switch } from "@/components/ui/switch";
import { Loader2, TrendingUp, Wallet, PieChart, Save, Receipt, DollarSign, Check, Trash2, Plus, X, CalendarClock, AlertTriangle, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { startOfWeek, endOfWeek, isWithinInterval, startOfMonth, endOfMonth, format, differenceInCalendarWeeks, addWeeks } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BillScheduleItem {
  id: number;
  name: string;
  amount: string;
  dueDay: number;
  category: string;
  isVariable: boolean;
  autopay: boolean;
  notes?: string | null;
}

const BILL_CATEGORIES = ["Rent / Mortgage", "Car Insurance", "Health Insurance", "Utilities", "Internet / Phone", "Subscriptions", "Loans", "Other"];

export default function Dashboard() {
  const { data: settings, isLoading: isSettingsLoading } = useBudgetSettings();
  const { toast } = useToast();

  const { data: incomeLogs, isLoading: isLogsLoading } = useQuery<WeeklyIncomeLog[]>({ queryKey: ["/api/income"] });

  const { data: latestIncomeResponse, isLoading: isLatestLoading, refetch: refetchLatest } = useQuery<{
    weekStartDate: string; myIncome: number; spouseIncome: number; totalWeeklyIncome: number; updatedAt: string;
  } | null>({
    queryKey: ["/api/income/latest"],
    staleTime: 0, gcTime: 0, refetchOnWindowFocus: true, refetchInterval: 1000, retry: true,
  });

  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible") refetchLatest(); };
    const onFocus = () => refetchLatest();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => { window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onVis); };
  }, [refetchLatest]);

  const { data: spendingLogs, isLoading: isSpendingLoading } = useQuery<SpendingLog[]>({ queryKey: ["/api/spending"] });
  const { data: balances } = useQuery<AccountBalance[]>({ queryKey: ["/api/balances"] });
  const { data: billsFundingLogs } = useQuery<BillsFundingLog[]>({ queryKey: ["/api/bills-funding"] });
  const { data: ledgerAccounts } = useAccountsWithBalances();
  const { data: ledgerTransactions } = useTransactions();

  // Bill Schedule
  const { data: billSchedule, isLoading: isBillScheduleLoading } = useQuery<BillScheduleItem[]>({ queryKey: ["/api/bill-schedule"] });
  const [showBillSchedule, setShowBillSchedule] = useState(false);
  const [showAddBill, setShowAddBill] = useState(false);
  const [editingBill, setEditingBill] = useState<BillScheduleItem | null>(null);
  const [billForm, setBillForm] = useState({ name: "", amount: "", dueDay: "", category: "Other", isVariable: false, autopay: false, notes: "" });

  const createBill = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", "/api/bill-schedule", data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/bill-schedule"] }); setShowAddBill(false); setBillForm({ name: "", amount: "", dueDay: "", category: "Other", isVariable: false, autopay: false, notes: "" }); toast({ title: "Bill added!" }); },
    onError: () => toast({ title: "Error adding bill", variant: "destructive" }),
  });

  const updateBill = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { const res = await apiRequest("PATCH", `/api/bill-schedule/${id}`, data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/bill-schedule"] }); setEditingBill(null); setShowAddBill(false); toast({ title: "Bill updated!" }); },
    onError: () => toast({ title: "Error updating bill", variant: "destructive" }),
  });

  const deleteBill = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/bill-schedule/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/bill-schedule"] }); toast({ title: "Bill removed" }); },
  });

  const handleSaveBill = () => {
    if (!billForm.name || !billForm.amount || !billForm.dueDay) return;
    if (editingBill) { updateBill.mutate({ id: editingBill.id, data: billForm }); }
    else { createBill.mutate(billForm); }
  };

  const startEditBill = (bill: BillScheduleItem) => {
    setEditingBill(bill);
    setBillForm({ name: bill.name, amount: bill.amount, dueDay: String(bill.dueDay), category: bill.category, isVariable: bill.isVariable, autopay: bill.autopay, notes: bill.notes || "" });
    setShowAddBill(true);
  };

  // Bills Funding Week Selector
  const [billsMyTransfer, setBillsMyTransfer] = useState("");
  const [billsSpouseTransfer, setBillsSpouseTransfer] = useState("");
  const [billsNote, setBillsNote] = useState("");

  const today = new Date();
  const monthStart = startOfMonth(today);
  const firstMondayOfMonth = startOfWeek(monthStart, { weekStartsOn: 1 });
  const adjustedFirstMonday = firstMondayOfMonth < monthStart
    ? new Date(firstMondayOfMonth.getTime() + 7 * 24 * 60 * 60 * 1000)
    : firstMondayOfMonth;

  const monthWeeks = Array.from({ length: 4 }, (_, i) => {
    const weekStart = addWeeks(adjustedFirstMonday, i);
    return { label: `Week ${i + 1} — ${format(weekStart, "MMM d")}`, value: format(weekStart, "yyyy-MM-dd") };
  });

  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const currentWeekStartStr = format(currentWeekStart, "yyyy-MM-dd");
  const defaultBillsWeek = monthWeeks.find(w => w.value === currentWeekStartStr)?.value ?? monthWeeks[monthWeeks.length - 1].value;
  const [selectedBillsWeek, setSelectedBillsWeek] = useState(defaultBillsWeek);

  // Income Modal
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [incomeMyAmount, setIncomeMyAmount] = useState("");
  const [incomeSpouseAmount, setIncomeSpouseAmount] = useState("");
  const [incomeDepositEnabled, setIncomeDepositEnabled] = useState(true);
  const [myDepositAccountId, setMyDepositAccountId] = useState<string>("");
  const [spouseDepositAccountId, setSpouseDepositAccountId] = useState<string>("");

  const weekStartForModal = startOfWeek(new Date(), { weekStartsOn: 1 });
  const currentWeekStartDateForModal = format(weekStartForModal, "yyyy-MM-dd");

  const saveIncomeMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", "/api/income", data); return res.json(); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/income"] });
      queryClient.invalidateQueries({ queryKey: ["/api/income/latest"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts/with-balances"] });
      setShowIncomeModal(false); setIncomeMyAmount(""); setIncomeSpouseAmount("");
      toast({ title: "Income logged!", description: "Weekly income saved successfully." });
    },
    onError: () => toast({ title: "Error saving income", variant: "destructive" }),
  });

  const saveBillsFunding = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", "/api/bills-funding", data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/bills-funding"] }); queryClient.invalidateQueries({ queryKey: ["/api/accounts/with-balances"] }); toast({ title: "Saved", description: "Bills funding logged." }); },
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" }),
  });

  const deleteBillsFunding = useMutation({
    mutationFn: async (weekStartDate: string) => { await apiRequest("DELETE", `/api/bills-funding/${weekStartDate}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/bills-funding"] }); queryClient.invalidateQueries({ queryKey: ["/api/accounts/with-balances"] }); setBillsMyTransfer(""); setBillsSpouseTransfer(""); setBillsNote(""); toast({ title: "Reset" }); },
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to reset", variant: "destructive" }),
  });

  const form = useForm<InsertBudgetSettings>({
    resolver: zodResolver(insertBudgetSettingsSchema),
    defaultValues: {
      monthlyFixedBills: "0", splitMode: "AUTO", mySplitPct: "50", spouseSplitPct: "50",
      savingsMode: "PERCENT", savingsValue: "0", investingMode: "PERCENT", investingValue: "0",
      debtBufferMode: "PERCENT", debtBufferValue: "0", tradingMode: "PERCENT", tradingValue: "0",
      allocationFrequency: "MONTHLY", incomeSource: "MANUAL", avgWindowWeeks: 4,
      bufferGoalAmount: "1000", bufferRerouteEnabled: false, rerouteTarget: "SAVINGS",
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

  const selectedWeekFundingData = billsFundingLogs?.find(l => l.weekStartDate === selectedBillsWeek);

  useEffect(() => {
    if (selectedWeekFundingData) {
      setBillsMyTransfer(selectedWeekFundingData.myTransfer);
      setBillsSpouseTransfer(selectedWeekFundingData.spouseTransfer);
      setBillsNote(selectedWeekFundingData.note || "");
    } else {
      setBillsMyTransfer(""); setBillsSpouseTransfer(""); setBillsNote("");
    }
  }, [selectedBillsWeek, selectedWeekFundingData?.weekStartDate]);

  useEffect(() => {
    if (showIncomeModal && ledgerAccounts) {
      const pa = ledgerAccounts.find(a => a.type === "personal");
      const sa = ledgerAccounts.find(a => a.type === "spouse");
      if (pa && !myDepositAccountId) setMyDepositAccountId(String(pa.id));
      if (sa && !spouseDepositAccountId) setSpouseDepositAccountId(String(sa.id));
    }
  }, [showIncomeModal, ledgerAccounts]);

  if (isSettingsLoading || isLogsLoading || isSpendingLoading || isLatestLoading) {
    return <Layout title="Dashboard"><div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></Layout>;
  }

  // Core calculations
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

  const currentWeekLedgerSpending = (ledgerTransactions || [])
    .filter(tx => tx.type === "spend" && isWithinInterval(new Date(tx.date), { start: weekStart, end: weekEnd }));
  const totalWeeklySpent = currentWeekLedgerSpending.reduce((acc, tx) => acc + parseFloat(tx.amount), 0);
  const hasSpendingThisWeek = totalWeeklySpent > 0 || currentWeekLedgerSpending.length > 0;
  const remainingThisWeek = totalWeeklyIncome - totalWeeklySpent;

  const currentWeekFunding = billsFundingLogs?.find(l => l.weekStartDate === currentWeekStartDate);
  const weeklyBillsObligation = weeklyFixed;
  const weeklyMargin = totalWeeklyIncome - weeklyBillsObligation;
  const monthlyMargin = weeklyMargin * 4.33;

  // MTD bills tracking
  const adjustedFirstMondayStr = format(adjustedFirstMonday, "yyyy-MM-dd");
  const mtdLogs = (billsFundingLogs || []).filter(l =>
    l.weekStartDate >= adjustedFirstMondayStr && l.weekStartDate <= currentWeekStartStr
  );
  const weeksElapsedThisMonth = currentWeekStart >= adjustedFirstMonday
    ? Math.max(1, differenceInCalendarWeeks(currentWeekStart, adjustedFirstMonday, { weekStartsOn: 1 }) + 1)
    : 0;
  const mtdTarget = weeklyFixed * weeksElapsedThisMonth;
  const mtdFunded = mtdLogs.reduce((acc, l) => acc + parseFloat(l.myTransfer) + parseFloat(l.spouseTransfer), 0);
  const mtdDifference = mtdFunded - mtdTarget;
  const logsThisMonth = mtdLogs.length;
  const mtdShortfall = Math.max(0, mtdTarget - mtdFunded);
  // True free money = what's left after spending AND bills catch-up obligation
  const trueFreeThisWeek = remainingThisWeek - mtdShortfall;

  const myWeeklyTarget = weeklyFixed * (activeMyPct / 100);
  const spouseWeeklyTarget = weeklyFixed * (activeSpousePct / 100);
  const currentMyActual = selectedWeekFundingData ? parseFloat(selectedWeekFundingData.myTransfer) : parseFloat(billsMyTransfer || "0");
  const currentSpouseActual = selectedWeekFundingData ? parseFloat(selectedWeekFundingData.spouseTransfer) : parseFloat(billsSpouseTransfer || "0");

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

  // Joint Checking Headroom
  const jointCheckingAccount = ledgerAccounts?.find(a => a.name === "Joint Checking");
  const jointBalance = jointCheckingAccount?.currentBalance ?? 0;
  const todayDay = today.getDate();
  const scheduledBills = billSchedule || [];
  const totalScheduledMonthly = scheduledBills.reduce((acc, b) => acc + parseFloat(b.amount), 0);
  const billsStillDue = scheduledBills.filter(b => b.dueDay >= todayDay);
  const amountStillDue = billsStillDue.reduce((acc, b) => acc + parseFloat(b.amount), 0);
  const billsPastDue = scheduledBills.filter(b => b.dueDay < todayDay);
  const amountPastDue = billsPastDue.reduce((acc, b) => acc + parseFloat(b.amount), 0);
  const headroom = jointBalance - amountStillDue;
  const billsDueSoon = scheduledBills.filter(b => b.dueDay >= todayDay && b.dueDay <= todayDay + 7);
  const amountDueSoon = billsDueSoon.reduce((acc, b) => acc + parseFloat(b.amount), 0);

  const ordSuffix = (n: number) => n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";

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
                  <button onClick={() => setShowIncomeModal(true)} className="text-xs text-gold underline mt-0.5">Log now</button>
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
                <>
                  <div className={`text-2xl font-bold font-display tracking-tight ${weeklyMargin >= 0 ? "text-success" : "text-soft-red"}`}>
                    {weeklyMargin < 0 ? "-" : ""}${Math.abs(weeklyMargin).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                  {weeklyMargin < 0 && <p className="text-[10px] text-soft-red uppercase tracking-widest mt-1">Short this week</p>}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Weekly Spending */}
        <Card className="border-border bg-card shadow-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-secondary/20">
            <CardTitle className="text-lg flex items-center gap-2 text-gold"><Receipt className="w-5 h-5" /> Weekly Spending</CardTitle>
            <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Current week status</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {hasIncomeThisWeek ? (
              <>
                <div className="border-b pb-4 border-border space-y-3">
                  {/* True free money — the honest number */}
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                        {mtdShortfall > 0 ? "Actually Free This Week" : "Remaining This Week"}
                      </Label>
                      <p className={`text-3xl font-bold font-display ${trueFreeThisWeek > 0 ? "text-success" : "text-soft-red"}`}>
                        {trueFreeThisWeek < 0 ? "-" : ""}${Math.abs(trueFreeThisWeek).toFixed(2)}
                        <span className="text-xs ml-1 font-bold">{trueFreeThisWeek >= 0 ? "Free" : "Short"}</span>
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Spent</Label>
                      <p className="text-lg font-bold font-mono text-foreground">${totalWeeklySpent.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Breakdown — only shows when there's a shortfall */}
                  {mtdShortfall > 0 && (
                    <div className="bg-secondary/40 rounded-lg p-3 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Income this week</span>
                        <span className="font-mono font-bold text-foreground">${totalWeeklyIncome.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Already spent</span>
                        <span className="font-mono text-foreground">−${totalWeeklySpent.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs border-t border-border pt-1.5">
                        <span className="text-amber-400 font-bold">Bills catch-up owed</span>
                        <span className="font-mono font-bold text-amber-400">−${mtdShortfall.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between text-xs border-t border-border pt-1.5">
                        <span className="font-bold text-foreground">Actually free</span>
                        <span className={`font-mono font-bold ${trueFreeThisWeek >= 0 ? "text-success" : "text-soft-red"}`}>
                          {trueFreeThisWeek < 0 ? "-" : ""}${Math.abs(trueFreeThisWeek).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                {hasSpendingThisWeek ? (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    {[
                      { label: "Groceries", amount: currentWeekLedgerSpending.filter(s => s.category === "Groceries").reduce((a, s) => a + parseFloat(s.amount), 0) },
                      { label: "Gas / Fuel", amount: currentWeekLedgerSpending.filter(s => s.category === "Gas / Fuel").reduce((a, s) => a + parseFloat(s.amount), 0) },
                      { label: "Personal", amount: currentWeekLedgerSpending.filter(s => ["Personal (Me)", "Personal (Spouse)"].includes(s.category || "")).reduce((a, s) => a + parseFloat(s.amount), 0) },
                      { label: "Household", amount: currentWeekLedgerSpending.filter(s => s.category === "Household / Misc").reduce((a, s) => a + parseFloat(s.amount), 0) },
                    ].filter(c => c.amount > 0).map(cat => (
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
                <Button size="sm" variant="outline" onClick={() => setShowIncomeModal(true)} className="border-gold/50 text-gold">Log Income</Button>
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
              const checkingAccounts = ledgerAccounts?.filter(a => ["personal", "spouse", "joint"].includes(a.type)) || [];
              const bucketAccounts = ledgerAccounts?.filter(a => a.type === "bucket" && !a.excludeFromTotals && !["Tax Set-Aside", "Trading Funds"].includes(a.name)) || [];
              const taxesAccount = ledgerAccounts?.find(a => a.name === "Tax Set-Aside");
              const tradingAccount = ledgerAccounts?.find(a => a.name === "Trading Funds");
              const totalCash = [...checkingAccounts, ...bucketAccounts].reduce((acc, a) => acc + a.currentBalance, 0);
              return (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {checkingAccounts.map(account => (
                      <div key={account.id} className="flex justify-between items-center py-1">
                        <span className="text-xs text-muted-foreground truncate">{account.name}</span>
                        <span className="text-sm font-mono font-bold text-foreground">${account.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                      </div>
                    ))}
                  </div>
                  {bucketAccounts.length > 0 && (
                    <div className="pt-1 border-t border-border grid grid-cols-2 gap-2">
                      {bucketAccounts.map(account => (
                        <div key={account.id} className="flex justify-between items-center py-1">
                          <span className="text-xs text-muted-foreground truncate">{account.name}</span>
                          <span className="text-sm font-mono font-bold text-foreground">${account.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {taxesAccount && (
                    <div className="flex justify-between items-center py-1 border-t border-border pt-2">
                      <span className="text-xs text-muted-foreground">Taxes Set-Aside</span>
                      <span className="text-sm font-mono font-bold text-amber-500">${taxesAccount.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2 border-t border-border mt-2">
                    <span className="text-sm font-bold text-foreground">Total Cash</span>
                    <span className="text-lg font-mono font-bold text-gold">${totalCash.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  </div>
                  {tradingAccount && (
                    <div className="flex justify-between items-center py-1 text-muted-foreground">
                      <span className="text-[10px] uppercase tracking-widest">Trading (separate)</span>
                      <span className="text-xs font-mono">${tradingAccount.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </div>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>

        {/* Joint Checking Headroom — only shows when bills are scheduled */}
        {scheduledBills.length > 0 && (
          <Card className="border-border bg-card shadow-2xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-border bg-secondary/20">
              <CardTitle className="text-lg flex items-center gap-2 text-gold"><CalendarClock className="w-5 h-5" /> Joint Checking Headroom</CardTitle>
              <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Bills coverage for {format(today, "MMMM")}</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-secondary/30 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Joint Balance</p>
                  <p className="font-mono font-bold text-sm text-foreground">${jointBalance.toFixed(0)}</p>
                </div>
                <div className="bg-secondary/30 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Still Due</p>
                  <p className="font-mono font-bold text-sm text-foreground">${amountStillDue.toFixed(0)}</p>
                </div>
                <div className={`rounded-xl p-3 ${headroom >= 0 ? "bg-success/10 border border-success/30" : "bg-soft-red/10 border border-soft-red/30"}`}>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Headroom</p>
                  <p className={`font-mono font-bold text-sm ${headroom >= 0 ? "text-success" : "text-soft-red"}`}>
                    {headroom >= 0 ? "+" : ""}${headroom.toFixed(0)}
                  </p>
                </div>
              </div>

              {billsDueSoon.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-2">
                  <p className="text-[10px] text-amber-400 uppercase tracking-widest font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Due in next 7 days — ${amountDueSoon.toFixed(0)}
                  </p>
                  {billsDueSoon.map(b => (
                    <div key={b.id} className="flex justify-between items-center text-xs">
                      <span className="text-foreground">{b.name}</span>
                      <span className="font-mono text-amber-400 font-bold">${parseFloat(b.amount).toFixed(0)} — due {b.dueDay}{ordSuffix(b.dueDay)}</span>
                    </div>
                  ))}
                </div>
              )}

              {headroom < 0 && (
                <div className="bg-soft-red/10 border border-soft-red/30 rounded-lg p-3 text-center">
                  <p className="text-xs font-bold text-soft-red">Joint Checking is short ${Math.abs(headroom).toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Fund more this week to cover remaining bills</p>
                </div>
              )}

              {billsPastDue.length > 0 && (
                <div className="border-t border-border pt-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Already processed — ${amountPastDue.toFixed(0)}</p>
                  <div className="space-y-1">
                    {billsPastDue.map(b => (
                      <div key={b.id} className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground flex items-center gap-1"><Check className="w-3 h-3 text-success" /> {b.name}</span>
                        <span className="font-mono text-muted-foreground">${parseFloat(b.amount).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Bill Schedule */}
        <Card className="border-border bg-card shadow-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-secondary/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2 text-gold"><CalendarClock className="w-5 h-5" /> Bill Schedule</CardTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs border-gold/40 text-gold"
                  onClick={() => { setEditingBill(null); setBillForm({ name: "", amount: "", dueDay: "", category: "Other", isVariable: false, autopay: false, notes: "" }); setShowAddBill(true); }}>
                  <Plus className="w-3 h-3 mr-1" /> Add Bill
                </Button>
                <button onClick={() => setShowBillSchedule(!showBillSchedule)} className="text-muted-foreground">
                  {showBillSchedule ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
              {scheduledBills.length} bills · ${totalScheduledMonthly.toFixed(0)}/mo
            </CardDescription>
          </CardHeader>

          {showBillSchedule && (
            <CardContent className="p-4 space-y-2">
              {isBillScheduleLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : scheduledBills.length === 0 ? (
                <div className="text-center py-6 space-y-2">
                  <p className="text-sm text-muted-foreground">No bills added yet</p>
                  <Button size="sm" variant="outline" className="border-gold/40 text-gold" onClick={() => setShowAddBill(true)}>
                    <Plus className="w-3 h-3 mr-1" /> Add your first bill
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {[...scheduledBills].sort((a, b) => a.dueDay - b.dueDay).map(bill => {
                    const isPast = bill.dueDay < todayDay;
                    const isDueSoon = !isPast && bill.dueDay <= todayDay + 7;
                    return (
                      <div key={bill.id} className={`flex items-center justify-between p-3 rounded-lg border ${isPast ? "border-border bg-secondary/10 opacity-60" : isDueSoon ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-secondary/20"}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">{bill.name}</span>
                            {bill.autopay && <Zap className="w-3 h-3 text-gold flex-shrink-0" />}
                            {bill.isVariable && <span className="text-[9px] text-muted-foreground uppercase">~est</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{bill.category}</span>
                            <span className="text-[10px] text-muted-foreground">·</span>
                            <span className={`text-[10px] font-bold ${isPast ? "text-success" : isDueSoon ? "text-amber-400" : "text-muted-foreground"}`}>
                              {isPast ? "✓ " : ""}Due {bill.dueDay}{ordSuffix(bill.dueDay)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <span className="font-mono font-bold text-sm text-foreground">${parseFloat(bill.amount).toFixed(0)}</span>
                          <button onClick={() => startEditBill(bill)} className="text-muted-foreground hover:text-foreground p-1">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button onClick={() => { if (confirm(`Remove ${bill.name}?`)) deleteBill.mutate(bill.id); }} className="text-muted-foreground hover:text-soft-red p-1">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Monthly Total</span>
                    <span className="font-mono font-bold text-gold">${totalScheduledMonthly.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Bills Funding Tracker */}
        <Card className="border-border bg-card shadow-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-secondary/20">
            <CardTitle className="text-lg flex items-center gap-2 text-gold"><DollarSign className="w-5 h-5" /> Bills Funding</CardTitle>
            <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Weekly transfers to Joint Bills</CardDescription>
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
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Log Week</Label>
                <Select value={selectedBillsWeek} onValueChange={setSelectedBillsWeek}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {monthWeeks.map(w => (
                      <SelectItem key={w.value} value={w.value}>
                        {w.label}{billsFundingLogs?.find(l => l.weekStartDate === w.value) ? " ✓" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-between items-center">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Transfers</Label>
                {selectedWeekFundingData && <span className="text-[10px] uppercase font-bold text-success flex items-center gap-1"><Check className="w-3 h-3" /> Logged</span>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-widest">My Transfer</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-sm">$</span>
                    <Input type="number" step="0.01" value={billsMyTransfer} onChange={e => setBillsMyTransfer(e.target.value)} className="h-9 font-mono bg-secondary border-border" placeholder={myWeeklyTarget.toFixed(0)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-widest">Spouse Transfer</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-sm">$</span>
                    <Input type="number" step="0.01" value={billsSpouseTransfer} onChange={e => setBillsSpouseTransfer(e.target.value)} className="h-9 font-mono bg-secondary border-border" placeholder={spouseWeeklyTarget.toFixed(0)} />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => saveBillsFunding.mutate({ weekStartDate: selectedBillsWeek, myTransfer: billsMyTransfer || "0", spouseTransfer: billsSpouseTransfer || "0", note: billsNote || undefined })} disabled={saveBillsFunding.isPending}>
                  {saveBillsFunding.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                  {selectedWeekFundingData ? "Update" : "Save"}
                </Button>
                {selectedWeekFundingData && (
                  <Button size="sm" variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10"
                    onClick={() => { if (confirm("Reset this week's bills funding entry?")) deleteBillsFunding.mutate(selectedBillsWeek); }}
                    disabled={deleteBillsFunding.isPending}>
                    {deleteBillsFunding.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                )}
              </div>
            </div>

            {selectedWeekFundingData && (
              <div className="bg-secondary/20 rounded-xl p-4 space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Suggested vs Actual</Label>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase">Me</p>
                    <p className="font-mono">
                      <span className="text-muted-foreground">${myWeeklyTarget.toFixed(0)}</span>
                      <span className="text-muted-foreground mx-1">/</span>
                      <span className={currentMyActual >= myWeeklyTarget ? "text-success font-bold" : "text-gold font-bold"}>${currentMyActual.toFixed(0)}</span>
                    </p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] text-muted-foreground uppercase">Spouse</p>
                    <p className="font-mono">
                      <span className="text-muted-foreground">${spouseWeeklyTarget.toFixed(0)}</span>
                      <span className="text-muted-foreground mx-1">/</span>
                      <span className={currentSpouseActual >= spouseWeeklyTarget ? "text-success font-bold" : "text-gold font-bold"}>${currentSpouseActual.toFixed(0)}</span>
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
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{mtdDifference >= 0 ? "Ahead" : "Behind"}</p>
                  <p className={`font-mono font-bold text-sm ${mtdDifference >= 0 ? "text-success" : "text-soft-red"}`}>
                    {mtdDifference >= 0 ? "+" : ""}${mtdDifference.toFixed(0)}
                  </p>
                </div>
              </div>
              {mtdShortfall > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-amber-400 uppercase tracking-widest font-bold">Catch-up needed</p>
                  <p className="text-sm font-bold font-mono text-amber-400">${mtdShortfall.toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Add to next week's transfer to stay on track</p>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground text-center">
                {logsThisMonth} of {weeksElapsedThisMonth} week{weeksElapsedThisMonth !== 1 ? "s" : ""} logged
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Bucket Plan */}
        <Card className="border-border bg-card shadow-2xl">
          <CardHeader className="pb-3 border-b border-border bg-secondary/20">
            <CardTitle className="text-lg flex items-center gap-2 text-gold"><PieChart className="w-5 h-5" /> Bucket Plan</CardTitle>
            <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Monthly Margin Allocation</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {hasIncomeThisWeek ? (
              <div className="space-y-4">
                {[{ label: "Savings", amount: bucketSavings }, { label: "Investing", amount: bucketInvesting }, { label: "Debt + Buffer", amount: bucketDebt }, { label: "Trading", amount: bucketTrading }].map(bucket => (
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
                <Button size="sm" variant="outline" onClick={() => setShowIncomeModal(true)} className="border-gold/50 text-gold">Log Income</Button>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* FAB */}
      <button onClick={() => setShowIncomeModal(true)} className="fixed bottom-24 right-4 w-14 h-14 bg-gold rounded-full shadow-lg flex items-center justify-center z-40 hover:bg-gold/90 transition-all active:scale-95">
        <Plus className="w-6 h-6 text-black" />
      </button>

      {/* Add/Edit Bill Modal */}
      {showAddBill && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center overflow-hidden">
          <div className="bg-background border-t border-border rounded-t-2xl w-full max-w-md px-6 pt-6 pb-24 space-y-4 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">{editingBill ? "Edit Bill" : "Add Bill"}</h2>
              <button onClick={() => { setShowAddBill(false); setEditingBill(null); }} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-widest">Bill Name</Label>
                <Input value={billForm.name} onChange={e => setBillForm(f => ({ ...f, name: e.target.value }))} className="mt-1 bg-secondary border-border" placeholder="e.g. Rent, Netflix, Car Insurance" autoFocus />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-widest">Amount</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input type="number" value={billForm.amount} onChange={e => setBillForm(f => ({ ...f, amount: e.target.value }))} className="pl-7 bg-secondary border-border" placeholder="0" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-widest">Due Day</Label>
                <Input type="number" min="1" max="31" value={billForm.dueDay} onChange={e => setBillForm(f => ({ ...f, dueDay: e.target.value }))} className="mt-1 bg-secondary border-border" placeholder="1–31" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-widest">Category</Label>
                <Select value={billForm.category} onValueChange={v => setBillForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="mt-1 bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{BILL_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div><Label className="text-sm text-foreground">Variable Amount</Label><p className="text-xs text-muted-foreground">Amount is estimated (utilities etc.)</p></div>
              <Switch checked={billForm.isVariable} onCheckedChange={v => setBillForm(f => ({ ...f, isVariable: v }))} />
            </div>

            <div className="flex items-center justify-between">
              <div><Label className="text-sm text-foreground">Autopay</Label><p className="text-xs text-muted-foreground">Automatically charged each month</p></div>
              <Switch checked={billForm.autopay} onCheckedChange={v => setBillForm(f => ({ ...f, autopay: v }))} />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-widest">Notes (optional)</Label>
              <Input value={billForm.notes} onChange={e => setBillForm(f => ({ ...f, notes: e.target.value }))} className="mt-1 bg-secondary border-border" placeholder="Any notes..." />
            </div>

            <Button className="w-full bg-gold hover:bg-gold/90 text-black font-bold" onClick={handleSaveBill} disabled={createBill.isPending || updateBill.isPending}>
              {(createBill.isPending || updateBill.isPending) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingBill ? "Update Bill" : "Add Bill"}
            </Button>
          </div>
        </div>
      )}

      {/* Income Modal */}
      {showIncomeModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center overflow-hidden">
          <div className="bg-background border-t border-border rounded-t-2xl w-full max-w-md px-6 pt-6 pb-24 space-y-4 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Log Weekly Income</h2>
              <button onClick={() => setShowIncomeModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-muted-foreground">Week of {format(weekStartForModal, "MMM d, yyyy")}</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-widest">My Income</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input type="number" value={incomeMyAmount} onChange={e => setIncomeMyAmount(e.target.value)} className="pl-7 bg-secondary border-border" placeholder="0" autoFocus />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-widest">Spouse Income</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input type="number" value={incomeSpouseAmount} onChange={e => setIncomeSpouseAmount(e.target.value)} className="pl-7 bg-secondary border-border" placeholder="0" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div><Label className="text-sm text-foreground">Deposit to Accounts</Label><p className="text-xs text-muted-foreground">Add income to account balances</p></div>
              <Switch checked={incomeDepositEnabled} onCheckedChange={setIncomeDepositEnabled} />
            </div>

            {incomeDepositEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-widest">My Deposit Into</Label>
                  <Select value={myDepositAccountId} onValueChange={setMyDepositAccountId}>
                    <SelectTrigger className="mt-1 bg-secondary border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{personalAccounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-widest">Spouse Deposit Into</Label>
                  <Select value={spouseDepositAccountId} onValueChange={setSpouseDepositAccountId}>
                    <SelectTrigger className="mt-1 bg-secondary border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{personalAccounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <Button className="w-full bg-gold hover:bg-gold/90 text-black font-bold"
              onClick={() => saveIncomeMutation.mutate({ weekStartDate: currentWeekStartDateForModal, myIncome: incomeMyAmount || "0", spouseIncome: incomeSpouseAmount || "0", deposited: incomeDepositEnabled, myDepositAccountId: myDepositAccountId ? parseInt(myDepositAccountId) : null, spouseDepositAccountId: spouseDepositAccountId ? parseInt(spouseDepositAccountId) : null })}
              disabled={saveIncomeMutation.isPending}>
              {saveIncomeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save & Deposit
            </Button>
          </div>
        </div>
      )}
    </Layout>
  );
}
