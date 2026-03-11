import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target, Flame, LineChart, Info, CheckCircle, Zap } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InvestmentSettings } from "@shared/schema";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function calculateFutureValue(presentValue: number, monthlyContribution: number, annualReturn: number, months: number): number {
  const monthlyRate = Math.pow(1 + annualReturn, 1/12) - 1;
  if (monthlyRate === 0) return presentValue + monthlyContribution * months;
  const compoundedPrincipal = presentValue * Math.pow(1 + monthlyRate, months);
  const futureValueOfContributions = monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  return compoundedPrincipal + futureValueOfContributions;
}

function calculateMonthlyNeededToCoast(currentBalance: number, coastTarget: number, annualReturn: number, yearsToTarget: number): number {
  if (currentBalance >= coastTarget) return 0;
  const months = yearsToTarget * 12;
  const monthlyRate = Math.pow(1 + annualReturn, 1/12) - 1;
  if (monthlyRate === 0) return (coastTarget - currentBalance) / months;
  const compoundedPrincipal = currentBalance * Math.pow(1 + monthlyRate, months);
  const remaining = coastTarget - compoundedPrincipal;
  if (remaining <= 0) return 0;
  return remaining / ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
}

function calculateTimeToGoal(currentBalance: number, monthlyContribution: number, annualReturn: number, targetBalance: number): number | null {
  if (currentBalance >= targetBalance) return 0;
  if (monthlyContribution <= 0 && annualReturn <= 0) return null;
  const monthlyRate = Math.pow(1 + annualReturn, 1/12) - 1;
  for (let month = 1; month <= 600; month++) {
    const fv = calculateFutureValue(currentBalance, monthlyContribution, annualReturn, month);
    if (fv >= targetBalance) return month / 12;
  }
  return null;
}

export default function Invest() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<InvestmentSettings>({
    queryKey: ["/api/investment"],
  });

  const [investedBalance, setInvestedBalance] = useState("0");
  const [monthlyContribution, setMonthlyContribution] = useState("0");
  const [safeWithdrawalRate, setSafeWithdrawalRate] = useState("0.04");
  const [targetMonthlyIncome, setTargetMonthlyIncome] = useState("2000");
  const [expectedAnnualReturn, setExpectedAnnualReturn] = useState("0.07");
  const [currentAge, setCurrentAge] = useState(30);
  const [targetAge, setTargetAge] = useState(55);
  const [inflationRate, setInflationRate] = useState("0.02");
  const [useInflationAdjustedGoal, setUseInflationAdjustedGoal] = useState(true);

  useEffect(() => {
    if (settings) {
      setInvestedBalance(settings.investedBalance || "0");
      setMonthlyContribution(settings.monthlyContribution || "0");
      setSafeWithdrawalRate(settings.safeWithdrawalRate || "0.04");
      setTargetMonthlyIncome(settings.targetMonthlyIncome || "2000");
      setExpectedAnnualReturn(settings.expectedAnnualReturn || "0.07");
      setCurrentAge(settings.currentAge || 30);
      setTargetAge(settings.targetAge || 55);
      setInflationRate(settings.inflationRate || "0.02");
      setUseInflationAdjustedGoal(settings.useInflationAdjustedGoal ?? true);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InvestmentSettings>) => {
      return apiRequest("POST", "/api/investment", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investment"] });
      toast({ title: "Settings saved" });
    },
    onError: () => {
      toast({ title: "Error saving settings", variant: "destructive" });
    }
  });

  const handleSave = () => {
    updateMutation.mutate({
      investedBalance,
      monthlyContribution,
      safeWithdrawalRate,
      targetMonthlyIncome,
      expectedAnnualReturn,
      currentAge,
      targetAge,
      inflationRate,
      useInflationAdjustedGoal
    });
  };

  const calculations = useMemo(() => {
    const invested = parseFloat(investedBalance) || 0;
    const swr = parseFloat(safeWithdrawalRate) || 0.04;
    const targetMonthly = parseFloat(targetMonthlyIncome) || 0;
    const annualReturn = parseFloat(expectedAnnualReturn) || 0.07;
    const inflation = parseFloat(inflationRate) || 0.02;
    const contribution = parseFloat(monthlyContribution) || 0;
    const yearsToTarget = targetAge - currentAge;

    const safeAnnual = invested * swr;
    const safeMonthly = safeAnnual / 12;
    const requiredPortfolio = (targetMonthly * 12) / swr;
    const progressPct = requiredPortfolio > 0 ? Math.min((invested / requiredPortfolio) * 100, 100) : 0;
    const remainingToGoal = Math.max(0, requiredPortfolio - invested);

    const milestones = [500, 1000, 2000, 4000].map(monthlyAmount => ({
      monthly: monthlyAmount,
      required: (monthlyAmount * 12) / swr,
      reached: invested >= (monthlyAmount * 12) / swr
    }));

    let coastNeededToday = 0;
    let adjustedRequiredPortfolio = requiredPortfolio;
    let adjustedTargetMonthly = targetMonthly;

    if (yearsToTarget > 0) {
      if (useInflationAdjustedGoal) {
        adjustedTargetMonthly = targetMonthly * Math.pow(1 + inflation, yearsToTarget);
        adjustedRequiredPortfolio = (adjustedTargetMonthly * 12) / swr;
      }
      coastNeededToday = adjustedRequiredPortfolio / Math.pow(1 + annualReturn, yearsToTarget);
    }

    const coastProgressPct = coastNeededToday > 0 ? Math.min((invested / coastNeededToday) * 100, 100) : 0;
    const coastRemaining = Math.max(0, coastNeededToday - invested);
    const coastAchieved = invested >= coastNeededToday && coastNeededToday > 0;

    const monthlyNeededToCoast = yearsToTarget > 0
      ? calculateMonthlyNeededToCoast(invested, coastNeededToday, annualReturn, yearsToTarget)
      : 0;

    const projectionYears = [1, 3, 5, 10, 15, 20, yearsToTarget].filter((v, i, a) => v > 0 && a.indexOf(v) === i).sort((a, b) => a - b);
    const projections = projectionYears.map(years => ({
      years,
      projected: calculateFutureValue(invested, contribution, annualReturn, years * 12),
      isTarget: years === yearsToTarget
    }));

    const timeToCoast = contribution > 0
      ? calculateTimeToGoal(invested, contribution, annualReturn, coastNeededToday)
      : null;

    const timeToGoal = contribution > 0
      ? calculateTimeToGoal(invested, contribution, annualReturn, requiredPortfolio)
      : null;

    return {
      invested, swr, safeAnnual, safeMonthly, targetMonthly,
      requiredPortfolio, progressPct, remainingToGoal, milestones,
      yearsToTarget, coastNeededToday, coastProgressPct, coastRemaining,
      coastAchieved, adjustedRequiredPortfolio, adjustedTargetMonthly,
      projections, timeToGoal, timeToCoast, contribution, annualReturn,
      monthlyNeededToCoast, inflation
    };
  }, [investedBalance, safeWithdrawalRate, targetMonthlyIncome, expectedAnnualReturn, currentAge, targetAge, inflationRate, useInflationAdjustedGoal, monthlyContribution]);

  if (isLoading) {
    return (
      <Layout title="Invest / FIRE">
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Invest / FIRE">
      <div className="space-y-4 pb-24">

        {/* === DASHBOARD SUMMARY === */}
        <Card className="border-border bg-card/50">
          <CardContent className="pt-4 pb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Portfolio Snapshot</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Invested</p>
                <p className="text-lg font-bold text-gold">{formatCurrency(calculations.invested)}</p>
              </div>
              <div className="bg-background/50 rounded-lg p-3 border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Monthly/Safe</p>
                <p className="text-lg font-bold text-gold">{formatCurrency(calculations.safeMonthly)}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Coast FIRE</span>
                  <span className="text-foreground font-medium">{calculations.coastProgressPct.toFixed(1)}%</span>
                </div>
                <Progress value={calculations.coastProgressPct} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Freedom Goal</span>
                  <span className="text-foreground font-medium">{calculations.progressPct.toFixed(1)}%</span>
                </div>
                <Progress value={calculations.progressPct} className="h-2" />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3">Based on VTI/total market ~7% real return assumption</p>
          </CardContent>
        </Card>

        {/* === COAST FIRE === */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-gold">
              <Flame className="w-5 h-5" />
              Coast FIRE
            </CardTitle>
            <p className="text-xs text-muted-foreground">Invest enough now and let compounding do the rest — no more contributions needed.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-foreground">Invested Balance</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={investedBalance}
                  onChange={(e) => setInvestedBalance(e.target.value)}
                  className="pl-7 bg-background text-foreground border-border"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-foreground">Current Age</Label>
                <Input
                  type="number"
                  value={currentAge}
                  onChange={(e) => setCurrentAge(parseInt(e.target.value) || 0)}
                  className="bg-background text-foreground border-border"
                />
              </div>
              <div>
                <Label className="text-foreground">Target Age</Label>
                <Input
                  type="number"
                  value={targetAge}
                  onChange={(e) => setTargetAge(parseInt(e.target.value) || 0)}
                  className="bg-background text-foreground border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-foreground">Expected Return</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    value={(parseFloat(expectedAnnualReturn) * 100).toFixed(1)}
                    onChange={(e) => setExpectedAnnualReturn((parseFloat(e.target.value) / 100).toString())}
                    className="pr-7 bg-background text-foreground border-border"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">VTI avg ~10% nominal</p>
              </div>
              <div>
                <Label className="text-foreground">Inflation Rate</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    value={(parseFloat(inflationRate) * 100).toFixed(1)}
                    onChange={(e) => setInflationRate((parseFloat(e.target.value) / 100).toString())}
                    className="pr-7 bg-background text-foreground border-border"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-foreground cursor-pointer">Inflation Adjust Goal</Label>
              <Switch
                checked={useInflationAdjustedGoal}
                onCheckedChange={setUseInflationAdjustedGoal}
              />
            </div>

            {calculations.yearsToTarget <= 0 ? (
              <div className="bg-amber-900/20 border border-amber-800 p-3 rounded-lg flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400" />
                <p className="text-sm text-amber-300">Target age must be greater than current age</p>
              </div>
            ) : (
              <div className="bg-card/50 p-4 rounded-lg border border-border/50 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Coast FIRE Number</p>
                    <p className="text-xl font-bold text-gold">{formatCurrency(calculations.coastNeededToday)}</p>
                    {useInflationAdjustedGoal && <p className="text-[10px] text-amber-400">inflation-adjusted</p>}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">You Have</p>
                    <p className="text-xl font-bold text-foreground">{formatCurrency(calculations.invested)}</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Coast FIRE Progress</span>
                    <span className="font-medium">{calculations.coastProgressPct.toFixed(1)}%</span>
                  </div>
                  <Progress value={calculations.coastProgressPct} className="h-3" />
                </div>

                {calculations.coastAchieved ? (
                  <div className="bg-green-900/20 border border-green-800 p-3 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-medium">Coast FIRE Achieved! 🎉</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <p className="text-xs text-muted-foreground">Remaining to Coast</p>
                      <p className="text-sm font-bold text-destructive">{formatCurrency(calculations.coastRemaining)}</p>
                    </div>
                    {calculations.monthlyNeededToCoast > 0 && (
                      <div className="bg-gold/10 border border-gold/30 p-3 rounded-lg flex items-center gap-2">
                        <Zap className="w-4 h-4 text-gold" />
                        <div>
                          <p className="text-xs text-muted-foreground">Monthly needed to Coast by age {targetAge}</p>
                          <p className="text-base font-bold text-gold">{formatCurrency(calculations.monthlyNeededToCoast)}/mo</p>
                        </div>
                      </div>
                    )}
                    {calculations.timeToCoast !== null && calculations.contribution > 0 && (
                      <div className="flex justify-between">
                        <p className="text-xs text-muted-foreground">Time to Coast at current rate</p>
                        <p className="text-sm font-medium text-foreground">{calculations.timeToCoast.toFixed(1)} yrs</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">Target portfolio at age {targetAge}</p>
                  <p className="text-base font-medium text-foreground">{formatCurrency(calculations.adjustedRequiredPortfolio)}</p>
                  {useInflationAdjustedGoal && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Inflation-adjusted income: {formatCurrency(calculations.adjustedTargetMonthly)}/mo
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* === GROWTH PROJECTION === */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-gold">
              <LineChart className="w-5 h-5" />
              Growth Projection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-foreground">Monthly Contribution</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(e.target.value)}
                  className="pl-7 bg-background text-foreground border-border"
                  placeholder="0"
                />
              </div>
            </div>

            {calculations.contribution > 0 ? (
              <>
                <div className="bg-card/50 rounded-lg border border-border/50 overflow-hidden">
                  <div className="px-4 py-2 border-b border-border/50">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Projected Portfolio Value</p>
                  </div>
                  <div className="divide-y divide-border/30">
                    {calculations.projections.map((p) => (
                      <div key={p.years} className={`flex justify-between items-center px-4 py-2 ${p.isTarget ? "bg-gold/5" : ""}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {p.isTarget ? `Age ${targetAge}` : `Year ${p.years}`}
                          </span>
                          {p.isTarget && <span className="text-[10px] bg-gold/20 text-gold px-1.5 py-0.5 rounded">target</span>}
                          {p.projected >= calculations.coastNeededToday && calculations.coastNeededToday > 0 && !calculations.coastAchieved && (
                            <span className="text-[10px] bg-green-900/30 text-green-400 px-1.5 py-0.5 rounded">coast ✓</span>
                          )}
                        </div>
                        <span className={`text-sm font-bold ${p.projected >= calculations.coastNeededToday && calculations.coastNeededToday > 0 ? "text-gold" : "text-foreground"}`}>
                          {formatCurrency(p.projected)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {calculations.timeToGoal !== null && (
                  <div className="bg-gold/10 border border-gold/30 p-4 rounded-lg">
                    <p className="text-xs text-muted-foreground">Estimated Time to Full Freedom Goal</p>
                    <p className="text-xl font-bold text-gold">
                      {calculations.timeToGoal === 0 ? "Goal reached! 🎉" : `${calculations.timeToGoal.toFixed(1)} years`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      At {formatCurrency(calculations.contribution)}/mo into VTI at {(calculations.annualReturn * 100).toFixed(1)}% return
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-card/50 p-4 rounded-lg border border-border/50 text-center space-y-1">
                <p className="text-muted-foreground text-sm">Enter a monthly contribution to see projections</p>
                {calculations.monthlyNeededToCoast > 0 && (
                  <p className="text-xs text-gold">Suggested: {formatCurrency(calculations.monthlyNeededToCoast)}/mo to reach Coast FIRE</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* === FREEDOM GOAL === */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-gold">
              <Target className="w-5 h-5" />
              Freedom Goal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-foreground">Target Monthly Income</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={targetMonthlyIncome}
                    onChange={(e) => setTargetMonthlyIncome(e.target.value)}
                    className="pl-7 bg-background text-foreground border-border"
                    placeholder="2000"
                  />
                </div>
              </div>
              <div>
                <Label className="text-foreground">Withdrawal Rate</Label>
                <Select value={safeWithdrawalRate} onValueChange={setSafeWithdrawalRate}>
                  <SelectTrigger className="bg-background text-foreground border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.03">3%</SelectItem>
                    <SelectItem value="0.035">3.5%</SelectItem>
                    <SelectItem value="0.04">4%</SelectItem>
                    <SelectItem value="0.045">4.5%</SelectItem>
                    <SelectItem value="0.05">5%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-card/50 p-4 rounded-lg border border-border/50 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Required Portfolio</p>
                  <p className="text-xl font-bold text-gold">{formatCurrency(calculations.requiredPortfolio)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Safe Monthly</p>
                  <p className="text-xl font-bold text-gold">{formatCurrency(calculations.safeMonthly)}</p>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Progress to Freedom</span>
                  <span className="font-medium">{calculations.progressPct.toFixed(1)}%</span>
                </div>
                <Progress value={calculations.progressPct} className="h-3" />
              </div>

              <div className="flex justify-between">
                <p className="text-xs text-muted-foreground">Remaining to Goal</p>
                <p className="text-sm font-bold text-destructive">{formatCurrency(calculations.remainingToGoal)}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Milestone Grid</p>
              <div className="grid grid-cols-2 gap-2">
                {calculations.milestones.map((m) => (
                  <div
                    key={m.monthly}
                    className={`p-3 rounded-lg border ${m.reached ? 'bg-green-900/20 border-green-800' : 'bg-card/50 border-border/50'}`}
                  >
                    <p className="text-xs text-muted-foreground">{formatCurrency(m.monthly)}/mo</p>
                    <p className={`text-sm font-medium ${m.reached ? 'text-green-400' : 'text-foreground'}`}>
                      {formatCurrency(m.required)}
                    </p>
                    {m.reached && <CheckCircle className="w-3 h-3 text-green-400 mt-1" />}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSave}
          className="w-full bg-gold hover:bg-gold/90 text-black font-bold"
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </Layout>
  );
}
