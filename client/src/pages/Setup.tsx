import { useBudgetSettings, useUpdateBudgetSettings } from "@/hooks/use-budget";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBudgetSettingsSchema, type InsertBudgetSettings } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Save, Wallet, ShieldCheck, Loader2, PieChart, TrendingUp } from "lucide-react";
import { useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Setup() {
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
      toast({
        title: "Settings saved",
        description: "Your budget configuration has been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update budget",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Layout title="Setup">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const incomeSource = form.watch("incomeSource");
  const splitMode = form.watch("splitMode");

  return (
    <Layout title="Setup">
      <div className="max-w-md mx-auto space-y-8 pb-24 px-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Income Source Section */}
            <Card className="border-border bg-card shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-gold">
                  <TrendingUp className="w-5 h-5" /> Income Source
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Calculation Method</CardDescription>
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
                      <FormDescription className="text-[10px] text-muted-foreground uppercase tracking-widest leading-relaxed">
                        Manual uses the numbers below. Log Average uses your Tracker data.
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Budget Inputs Section */}
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
                        <MoneyInput {...field} className="h-11 bg-secondary border-border text-foreground" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Contribution Split Section */}
            <Card className="border-border bg-card shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-gold">
                  <ShieldCheck className="w-5 h-5" /> Contribution Split
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Household division</CardDescription>
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

            {/* Bucket Configuration Section */}
            <Card className="border-border bg-card shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-gold">
                  <PieChart className="w-5 h-5" /> Bucket Configuration
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Margin Allocation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
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

            <Button type="submit" disabled={updateSettings.isPending} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-lg shadow-gold/20 active:scale-[0.98] transition-transform">
              {updateSettings.isPending ? "Saving..." : <><Save className="w-5 h-5 mr-2" /> Save Changes</>}
            </Button>
          </form>
        </Form>
      </div>
    </Layout>
  );
}
