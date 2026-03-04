import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useBudgetSettings, useUpdateBudgetSettings } from "@/hooks/use-budget";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { insertBudgetSettingsSchema, insertWeeklyIncomeLogSchema, type InsertBudgetSettings, type WeeklyIncomeLog, type AccountWithBalance } from "@shared/schema";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { api, buildUrl } from "@shared/routes";
import { format, startOfWeek } from "date-fns";
import {
  Loader2,
  Save,
  Settings2,
  ClipboardList,
  Download,
  Wallet,
  ShieldCheck,
  TrendingUp,
  PieChart,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  History,
  FileText,
  Car,
  TrendingDown,
} from "lucide-react";

function SetupTab() {
  const { data: settings, isLoading } = useBudgetSettings();
  const updateSettings = useUpdateBudgetSettings();
  const { toast } = useToast();

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
        monthlyFixedBills: settings.monthlyFixedBills?.toString() || "0",
        mySplitPct: settings.mySplitPct?.toString() || "50",
        spouseSplitPct: settings.spouseSplitPct?.toString() || "50",
        savingsValue: settings.savingsValue?.toString() || "0",
        investingValue: settings.investingValue?.toString() || "0",
        debtBufferValue: settings.debtBufferValue?.toString() || "0",
        tradingValue: settings.tradingValue?.toString() || "0",
        incomeSource: (settings.incomeSource as any) || "MANUAL",
        avgWindowWeeks: settings.avgWindowWeeks || 4,
        allocationFrequency: (settings.allocationFrequency as any) || "MONTHLY",
        splitMode: (settings.splitMode as any) || "AUTO",
        savingsMode: (settings.savingsMode as any) || "PERCENT",
        investingMode: (settings.investingMode as any) || "PERCENT",
        debtBufferMode: (settings.debtBufferMode as any) || "PERCENT",
        tradingMode: (settings.tradingMode as any) || "PERCENT",
        bufferGoalAmount: settings.bufferGoalAmount?.toString() || "1000",
        bufferRerouteEnabled: !!settings.bufferRerouteEnabled,
        rerouteTarget: (settings.rerouteTarget as any) || "SAVINGS",
      } as any);
    }
  }, [settings, form]);

  const onSubmit = async (data: InsertBudgetSettings) => {
    try {
      await updateSettings.mutateAsync(data);
      toast({ title: "Settings saved", description: "Your budget configuration has been updated." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update budget", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const splitMode = form.watch("splitMode");

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border-border bg-card shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-gold">
                <TrendingUp className="w-5 h-5" /> Income Source
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="incomeSource"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Tabs value={field.value} onValueChange={(v) => field.onChange(v)} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-secondary border border-border">
                          <TabsTrigger value="MANUAL" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground font-bold">Manual</TabsTrigger>
                          <TabsTrigger value="LOG_AVG" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground font-bold">Log Average</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </FormControl>
                    <FormDescription className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      Manual uses fixed numbers. Log Average uses your Tracker data.
                    </FormDescription>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-gold">
                <Wallet className="w-5 h-5" /> Budget Inputs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="monthlyFixedBills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Fixed Monthly Bills</FormLabel>
                    <FormControl>
                      <MoneyInput label="" {...field} className="h-11 bg-secondary border-border text-foreground" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-gold">
                <ShieldCheck className="w-5 h-5" /> Contribution Split
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="splitMode"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Tabs value={field.value} onValueChange={(v) => field.onChange(v as "AUTO" | "CUSTOM")} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-secondary border border-border">
                          <TabsTrigger value="AUTO" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground font-bold">Auto</TabsTrigger>
                          <TabsTrigger value="CUSTOM" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground font-bold">Custom</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </FormControl>
                  </FormItem>
                )}
              />
              {splitMode === "CUSTOM" && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <FormField
                    control={form.control}
                    name="mySplitPct"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">My Split %</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className="h-11 rounded-xl bg-secondary border-border text-foreground" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="spouseSplitPct"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Spouse Split %</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className="h-11 rounded-xl bg-secondary border-border text-foreground" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-gold">
                <PieChart className="w-5 h-5" /> Bucket Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { label: "Savings", mode: "savingsMode", value: "savingsValue" },
                { label: "Investing", mode: "investingMode", value: "investingValue" },
                { label: "Debt + Buffer", mode: "debtBufferMode", value: "debtBufferValue" },
                { label: "Trading", mode: "tradingMode", value: "tradingValue" },
              ].map((bucket) => (
                <div key={bucket.label} className="space-y-3">
                  <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{bucket.label}</FormLabel>
                  <div className="flex gap-2">
                    <FormField
                      control={form.control}
                      name={bucket.mode as any}
                      render={({ field }) => (
                        <FormItem className="w-24">
                          <FormControl>
                            <Tabs value={field.value} onValueChange={(v) => field.onChange(v)} className="w-full">
                              <TabsList className="grid w-full grid-cols-2 h-9 p-1 bg-secondary border border-border">
                                <TabsTrigger value="PERCENT" className="text-[10px] font-bold">%</TabsTrigger>
                                <TabsTrigger value="FIXED" className="text-[10px] font-bold">$</TabsTrigger>
                              </TabsList>
                            </Tabs>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={bucket.value as any}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input type="number" {...field} className="h-9 rounded-lg bg-secondary border-border text-foreground font-bold" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Button type="submit" disabled={updateSettings.isPending} className="w-full h-12 rounded-xl font-bold text-base shadow-lg">
            {updateSettings.isPending ? "Saving..." : <><Save className="w-5 h-5 mr-2" /> Save Changes</>}
          </Button>
        </form>
      </Form>
    </div>
  );
}

function TrackerTab() {
  const { toast } = useToast();
  const [depositToAccounts, setDepositToAccounts] = useState(true);
  const [myDepositAccountId, setMyDepositAccountId] = useState<string>("");
  const [spouseDepositAccountId, setSpouseDepositAccountId] = useState<string>("");
  
  const { data: incomeLogs, isLoading: loadingLogs } = useQuery<WeeklyIncomeLog[]>({
    queryKey: ["/api/income"],
  });

  const { data: accounts } = useQuery<AccountWithBalance[]>({
    queryKey: ["/api/accounts/with-balances"],
  });

  // Filter accounts for deposit options
  const myDepositOptions = accounts?.filter(a => 
    a.type === "personal" || a.type === "joint" || a.type === "bucket"
  ) || [];
  const spouseDepositOptions = accounts?.filter(a => 
    a.type === "spouse" || a.type === "joint" || a.type === "bucket"
  ) || [];

  // Set defaults when accounts load
  useEffect(() => {
    if (accounts && !myDepositAccountId) {
      const myDefault = accounts.find(a => a.type === "personal");
      if (myDefault) setMyDepositAccountId(String(myDefault.id));
    }
    if (accounts && !spouseDepositAccountId) {
      const spouseDefault = accounts.find(a => a.type === "spouse");
      if (spouseDefault) setSpouseDepositAccountId(String(spouseDefault.id));
    }
  }, [accounts, myDepositAccountId, spouseDepositAccountId]);

  const saveIncomeLog = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        myIncome: String(data.myIncome),
        spouseIncome: String(data.spouseIncome),
        deposited: depositToAccounts,
        myDepositAccountId: depositToAccounts && myDepositAccountId ? parseInt(myDepositAccountId) : null,
        spouseDepositAccountId: depositToAccounts && spouseDepositAccountId ? parseInt(spouseDepositAccountId) : null,
        myDepositAmount: depositToAccounts ? String(data.myIncome) : null,
        spouseDepositAmount: depositToAccounts ? String(data.spouseIncome) : null,
      };
      const res = await apiRequest("POST", "/api/income", payload);
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast({ 
        title: "Success", 
        description: depositToAccounts 
          ? "Income logged and deposited to accounts" 
          : "Income log saved (no deposit)" 
      });
      form.reset({
        weekStartDate: format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
        myIncome: "0",
        spouseIncome: "0",
        notes: "",
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save income log", variant: "destructive" });
    }
  });

  const deleteIncomeLog = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/income/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast({ title: "Success", description: "Income log deleted" });
    },
  });

  const currentMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const form = useForm({
    resolver: zodResolver(insertWeeklyIncomeLogSchema),
    defaultValues: {
      weekStartDate: format(currentMonday, "yyyy-MM-dd"),
      myIncome: "0",
      spouseIncome: "0",
      notes: "",
    },
  });

  if (loadingLogs) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-xl border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-gold">
            <Plus className="w-5 h-5" /> Log Weekly Income
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit((data) => saveIncomeLog.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Week Start Date</Label>
              <Input 
                type="date" 
                {...form.register("weekStartDate")}
                className="h-11 text-black bg-white rounded-xl font-medium"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <MoneyInput label="My Income" {...form.register("myIncome")} className="text-black bg-white" />
              <MoneyInput label="Spouse Income" {...form.register("spouseIncome")} className="text-black bg-white" />
            </div>

            {/* Deposit Toggle */}
            <div className="flex items-center justify-between py-3 px-4 bg-secondary/30 rounded-xl border border-border">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Deposit to Accounts</Label>
                <p className="text-[10px] text-muted-foreground">Add income to account balances</p>
              </div>
              <Switch
                data-testid="switch-deposit-toggle"
                checked={depositToAccounts}
                onCheckedChange={setDepositToAccounts}
              />
            </div>

            {/* Deposit Account Selection */}
            {depositToAccounts && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/20 rounded-xl border border-border/50">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">My Deposit Into</Label>
                  <Select value={myDepositAccountId} onValueChange={setMyDepositAccountId}>
                    <SelectTrigger data-testid="select-my-deposit-account" className="bg-white text-black h-10">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {myDepositOptions.map((account) => (
                        <SelectItem key={account.id} value={String(account.id)}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Spouse Deposit Into</Label>
                  <Select value={spouseDepositAccountId} onValueChange={setSpouseDepositAccountId}>
                    <SelectTrigger data-testid="select-spouse-deposit-account" className="bg-white text-black h-10">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {spouseDepositOptions.map((account) => (
                        <SelectItem key={account.id} value={String(account.id)}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Notes</Label>
              <Textarea 
                {...form.register("notes")}
                placeholder="Bonus, overtime, etc."
                className="rounded-xl resize-none bg-white text-black min-h-[60px]"
              />
            </div>
            <Button type="submit" disabled={saveIncomeLog.isPending} className="w-full h-11 rounded-xl font-bold shadow-lg">
              {saveIncomeLog.isPending ? "Saving..." : depositToAccounts ? "Save & Deposit" : "Save Entry"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-lg border-border bg-card">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <History className="w-4 h-4" /> Recent Entries
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="divide-y divide-border max-h-64 overflow-y-auto">
            {incomeLogs?.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground/40 italic text-xs uppercase tracking-widest">No entries yet.</p>
            ) : (
              incomeLogs?.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-3 h-3 text-gold" />
                      <span className="text-sm font-bold text-white">
                        {format(new Date(log.weekStartDate), "MMM d, yyyy")}
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs font-mono font-bold">
                      <span className="text-gold">Me: ${parseFloat(log.myIncome).toFixed(0)}</span>
                      <span className="text-gold">Spouse: ${parseFloat(log.spouseIncome).toFixed(0)}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm("Delete this entry?")) deleteIncomeLog.mutate(log.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ExportsTab() {
  const handleDownload = async (type: "expenses" | "mileage" | "debts", filename: string) => {
    const url = buildUrl(api.exports.csv.path, { type });
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <Card className="border-border shadow-xl bg-card overflow-hidden">
        <div className="h-1.5 bg-primary w-full" />
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-gold text-lg">
            <FileText className="w-5 h-5" /> Expenses CSV
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs uppercase font-bold tracking-widest">
            Business expense records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full h-11 rounded-xl font-bold shadow-lg" onClick={() => handleDownload("expenses", "business-expenses")}>
            <Download className="w-4 h-4 mr-2" /> Download
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border shadow-xl bg-card overflow-hidden">
        <div className="h-1.5 bg-success w-full" />
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-gold text-lg">
            <Car className="w-5 h-5" /> Mileage CSV
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs uppercase font-bold tracking-widest">
            Detailed mileage logs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full h-11 rounded-xl font-bold shadow-lg" onClick={() => handleDownload("mileage", "mileage-log")}>
            <Download className="w-4 h-4 mr-2" /> Download
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border shadow-xl bg-card overflow-hidden">
        <div className="h-1.5 bg-destructive w-full" />
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-gold text-lg">
            <TrendingDown className="w-5 h-5" /> Debts CSV
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs uppercase font-bold tracking-widest">
            Current debt snapshot
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full h-11 rounded-xl font-bold shadow-lg" onClick={() => handleDownload("debts", "debts-snapshot")}>
            <Download className="w-4 h-4 mr-2" /> Download
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("setup");

  return (
    <Layout title="Settings">
      <div className="space-y-4 pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-12 p-1 bg-secondary border border-border rounded-xl">
            <TabsTrigger 
              value="setup" 
              className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold flex items-center gap-1 text-xs"
            >
              <Settings2 className="w-4 h-4" /> Budget
            </TabsTrigger>
            <TabsTrigger 
              value="tracker" 
              className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold flex items-center gap-1 text-xs"
            >
              <ClipboardList className="w-4 h-4" /> Income
            </TabsTrigger>
            <TabsTrigger 
              value="exports" 
              className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold flex items-center gap-1 text-xs"
            >
              <Download className="w-4 h-4" /> Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="mt-4">
            <SetupTab />
          </TabsContent>

          <TabsContent value="tracker" className="mt-4">
            <TrackerTab />
          </TabsContent>

          <TabsContent value="exports" className="mt-4">
            <ExportsTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
