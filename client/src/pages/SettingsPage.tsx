import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useBudgetSettings, useUpdateBudgetSettings } from "@/hooks/use-budget";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { insertBudgetSettingsSchema, type InsertBudgetSettings } from "@shared/schema";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { api, buildUrl } from "@shared/routes";
import {
  Loader2,
  Save,
  Settings2,
  Download,
  Wallet,
  ShieldCheck,
  TrendingUp,
  PieChart,
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
      personalFlexPercent: 10,
      personalFlexMeSplitPct: 50,
      myAllowance: 0,
      spouseAllowance: 0,
      allowanceConfigured: false,
      groceryBudgetOverride: null,
      fuelBudgetOverride: null,
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
        personalFlexPercent: Number(settings.personalFlexPercent ?? 10),
        personalFlexMeSplitPct: Number(settings.personalFlexMeSplitPct ?? 50),
        myAllowance: Number(settings.myAllowance || 0),
        spouseAllowance: Number(settings.spouseAllowance || 0),
        allowanceConfigured: !!settings.allowanceConfigured,
        groceryBudgetOverride: settings.groceryBudgetOverride == null ? null : Number(settings.groceryBudgetOverride),
        fuelBudgetOverride: settings.fuelBudgetOverride == null ? null : Number(settings.fuelBudgetOverride),
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
              <FormField
                control={form.control}
                name="myAllowance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Me Allowance</FormLabel>
                    <FormControl><MoneyInput label="" {...field} value={field.value?.toString() || "0"} className="h-11 bg-secondary border-border text-foreground" /></FormControl>
                    <FormDescription className="text-xs">Required before Finance can recommend extra debt payment.</FormDescription>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="spouseAllowance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Spouse Allowance</FormLabel>
                    <FormControl><MoneyInput label="" {...field} value={field.value?.toString() || "0"} className="h-11 bg-secondary border-border text-foreground" /></FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="allowanceConfigured"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div><FormLabel>Allow debt recommendation</FormLabel><FormDescription>Explicitly confirm these allowances are configured.</FormDescription></div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField control={form.control} name="personalFlexPercent" render={({ field }) => <FormItem><FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Personal flex rate (%)</FormLabel><FormControl><Input type="number" min={0} max={100} value={field.value ?? 10} onChange={(event) => field.onChange(Number(event.target.value))} className="h-11 bg-secondary border-border text-foreground" /></FormControl><FormDescription className="text-xs">Percent of safe surplus protected after essentials.</FormDescription></FormItem>} />
                <FormField control={form.control} name="personalFlexMeSplitPct" render={({ field }) => <FormItem><FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Me personal flex split (%)</FormLabel><FormControl><Input type="number" min={0} max={100} value={field.value ?? 50} onChange={(event) => field.onChange(Number(event.target.value))} className="h-11 bg-secondary border-border text-foreground" /></FormControl><FormDescription className="text-xs">Spouse receives the remainder.</FormDescription></FormItem>} />
              </div>
              <FormField
                control={form.control}
                name="avgWindowWeeks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Variable-spend lookback (weeks)</FormLabel>
                    <FormControl><Input type="number" min={1} max={52} value={field.value ?? 4} onChange={(event) => field.onChange(Number(event.target.value))} className="h-11 bg-secondary border-border text-foreground" /></FormControl>
                    <FormDescription className="text-xs">Historical grocery and fuel suggestions use finalized, deduplicated expenses from this window.</FormDescription>
                  </FormItem>
                )}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="groceryBudgetOverride"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Temporary grocery weekly target</FormLabel>
                      <FormControl><MoneyInput label="" value={field.value?.toString() || ""} onChange={field.onChange} className="h-11 bg-secondary border-border text-foreground" /></FormControl>
                      <FormDescription className="text-xs">Leave blank to use history.</FormDescription>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fuelBudgetOverride"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Temporary fuel weekly target</FormLabel>
                      <FormControl><MoneyInput label="" value={field.value?.toString() || ""} onChange={field.onChange} className="h-11 bg-secondary border-border text-foreground" /></FormControl>
                      <FormDescription className="text-xs">Leave blank to use history.</FormDescription>
                    </FormItem>
                  )}
                />
              </div>
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
          <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-secondary border border-border rounded-xl">
            <TabsTrigger
              value="setup"
              className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold flex items-center gap-1 text-xs"
            >
              <Settings2 className="w-4 h-4" /> Budget
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

          <TabsContent value="exports" className="mt-4">
            <ExportsTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
