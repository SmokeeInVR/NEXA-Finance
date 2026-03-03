import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target, Flame, LineChart, Info, CheckCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InvestmentSettings } from "@shared/schema";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function calculateFutureValue(presentValue: number, monthlyContribution: number, annualReturn: number, months: number): number {
  const monthlyRate = Math.pow(1 + annualReturn, 1/12) - 1;
  const compoundedPrincipal = presentValue * Math.pow(1 + monthlyRate, months);
  const futureValueOfContributions = monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
  return compoundedPrincipal + futureValueOfContributions;
}

function calculateTimeToGoal(currentBalance: number, monthlyContribution: number, annualReturn: number, targetBalance: number): number | null {
  if (currentBalance >= targetBalance) return 0;
  if (monthlyContribution <= 0 && annualReturn <= 0) return null;
  
  const monthlyRate = Math.pow(1 + annualReturn, 1/12) - 1;
  
  for (let month = 1; month <= 600; month++) {
    const fv = calculateFutureValue(currentBalance, monthlyContribution, annualReturn, month);
    if (fv >= targetBalance) {
      return month / 12;
    }
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

    const yearsToTarget = targetAge - currentAge;
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

    const projections = [1, 3, 5, 10, 15].map(years => ({
      years,
      projected: calculateFutureValue(invested, contribution, annualReturn, years * 12)
    }));

    const timeToGoal = contribution > 0 
      ? calculateTimeToGoal(invested, contribution, annualReturn, requiredPortfolio)
      : null;

    return {
      invested,
      swr,
      safeAnnual,
      safeMonthly,
      targetMonthly,
      requiredPortfolio,
      progressPct,
      remainingToGoal,
      milestones,
      yearsToTarget,
      coastNeededToday,
      coastProgressPct,
      coastRemaining,
      coastAchieved,
      adjustedRequiredPortfolio,
      adjustedTargetMonthly,
      projections,
      timeToGoal,
      contribution,
      annualReturn
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
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-gold">
              <TrendingUp className="w-5 h-5" />
              4% Rule Snapshot
            </CardTitle>
            <p className="text-xs text-muted-foreground">SWR shows an estimate based on a conservative withdrawal rate.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="invested-balance" className="text-foreground">Invested Balance</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="invested-balance"
                  data-testid="input-invested-balance"
                  type="number"
                  value={investedBalance}
                  onChange={(e) => setInvestedBalance(e.target.value)}
                  className="pl-7 bg-background text-foreground border-border"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="swr" className="text-foreground">Safe Withdrawal Rate</Label>
              <Select value={safeWithdrawalRate} onValueChange={setSafeWithdrawalRate}>
                <SelectTrigger id="swr" data-testid="select-swr" className="bg-background text-foreground border-border">
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

            <div className="bg-card/50 p-4 rounded-lg border border-border/50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Safe Annual</p>
                  <p className="text-xl font-bold text-gold" data-testid="text-safe-annual">{formatCurrency(calculations.safeAnnual)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Safe Monthly</p>
                  <p className="text-xl font-bold text-gold" data-testid="text-safe-monthly">{formatCurrency(calculations.safeMonthly)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-gold">
              <Target className="w-5 h-5" />
              Freedom Goal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="target-monthly" className="text-foreground">Target Monthly Income</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="target-monthly"
                  data-testid="input-target-monthly"
                  type="number"
                  value={targetMonthlyIncome}
                  onChange={(e) => setTargetMonthlyIncome(e.target.value)}
                  className="pl-7 bg-background text-foreground border-border"
                  placeholder="2000"
                />
              </div>
            </div>

            <div className="bg-card/50 p-4 rounded-lg border border-border/50 space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Required Portfolio</p>
                <p className="text-2xl font-bold text-gold" data-testid="text-required-portfolio">{formatCurrency(calculations.requiredPortfolio)}</p>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="text-foreground font-medium" data-testid="text-progress-pct">{calculations.progressPct.toFixed(1)}%</span>
                </div>
                <Progress value={calculations.progressPct} className="h-3" />
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Remaining to Goal</p>
                <p className="text-lg font-bold text-destructive" data-testid="text-remaining">{formatCurrency(calculations.remainingToGoal)}</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium text-foreground mb-2">Milestone Grid</p>
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

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-gold">
              <Flame className="w-5 h-5" />
              Coast FIRE
            </CardTitle>
            <p className="text-xs text-muted-foreground">Coast FIRE means you stop contributing and let compounding do the work.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="current-age" className="text-foreground">Current Age</Label>
                <Input
                  id="current-age"
                  data-testid="input-current-age"
                  type="number"
                  value={currentAge}
                  onChange={(e) => setCurrentAge(parseInt(e.target.value) || 0)}
                  className="bg-background text-foreground border-border"
                />
              </div>
              <div>
                <Label htmlFor="target-age" className="text-foreground">Target Age</Label>
                <Input
                  id="target-age"
                  data-testid="input-target-age"
                  type="number"
                  value={targetAge}
                  onChange={(e) => setTargetAge(parseInt(e.target.value) || 0)}
                  className="bg-background text-foreground border-border"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="annual-return" className="text-foreground">Expected Annual Return</Label>
              <div className="relative">
                <Input
                  id="annual-return"
                  data-testid="input-annual-return"
                  type="number"
                  step="0.01"
                  value={(parseFloat(expectedAnnualReturn) * 100).toFixed(1)}
                  onChange={(e) => setExpectedAnnualReturn((parseFloat(e.target.value) / 100).toString())}
                  className="pr-7 bg-background text-foreground border-border"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>

            <div>
              <Label htmlFor="inflation-rate" className="text-foreground">Inflation Rate</Label>
              <div className="relative">
                <Input
                  id="inflation-rate"
                  data-testid="input-inflation-rate"
                  type="number"
                  step="0.01"
                  value={(parseFloat(inflationRate) * 100).toFixed(1)}
                  onChange={(e) => setInflationRate((parseFloat(e.target.value) / 100).toString())}
                  className="pr-7 bg-background text-foreground border-border"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="inflation-toggle" className="text-foreground cursor-pointer">Inflation Adjust Goal</Label>
              <Switch
                id="inflation-toggle"
                data-testid="switch-inflation-adjust"
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
                <div>
                  <p className="text-sm text-muted-foreground">
                    Coast FIRE Number (needed today)
                    {useInflationAdjustedGoal && <span className="text-xs text-amber-400 ml-1">(inflation-adjusted)</span>}
                  </p>
                  <p className="text-2xl font-bold text-gold" data-testid="text-coast-number">{formatCurrency(calculations.coastNeededToday)}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">You currently have</p>
                  <p className="text-lg font-medium text-foreground">{formatCurrency(calculations.invested)}</p>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Coast FIRE Progress</span>
                    <span className="text-foreground font-medium" data-testid="text-coast-progress">{calculations.coastProgressPct.toFixed(1)}%</span>
                  </div>
                  <Progress value={calculations.coastProgressPct} className="h-3" />
                </div>

                {calculations.coastAchieved ? (
                  <div className="bg-green-900/20 border border-green-800 p-3 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-medium">Coast FIRE Achieved!</span>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-muted-foreground">Remaining to Coast</p>
                    <p className="text-lg font-bold text-destructive" data-testid="text-coast-remaining">{formatCurrency(calculations.coastRemaining)}</p>
                  </div>
                )}

                <div className="pt-2 border-t border-border/50">
                  <p className="text-sm text-muted-foreground">Target portfolio at age {targetAge}</p>
                  <p className="text-lg font-medium text-foreground">{formatCurrency(calculations.adjustedRequiredPortfolio)}</p>
                  {useInflationAdjustedGoal && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Inflation-adjusted monthly income: {formatCurrency(calculations.adjustedTargetMonthly)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-gold">
              <LineChart className="w-5 h-5" />
              Growth Projection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="monthly-contribution" className="text-foreground">Monthly Contribution</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="monthly-contribution"
                  data-testid="input-monthly-contribution"
                  type="number"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(e.target.value)}
                  className="pl-7 bg-background text-foreground border-border"
                  placeholder="0"
                />
              </div>
            </div>

            {calculations.contribution > 0 && (
              <>
                <div className="bg-card/50 p-4 rounded-lg border border-border/50">
                  <p className="text-sm font-medium text-foreground mb-3">Projected Portfolio Value</p>
                  <div className="space-y-2">
                    {calculations.projections.map((p) => (
                      <div key={p.years} className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Year {p.years}</span>
                        <span className="text-sm font-medium text-gold">{formatCurrency(p.projected)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {calculations.timeToGoal !== null && (
                  <div className="bg-gold/10 border border-gold/30 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Estimated Time to Goal</p>
                    <p className="text-xl font-bold text-gold" data-testid="text-time-to-goal">
                      {calculations.timeToGoal === 0 
                        ? "Goal reached!" 
                        : `${calculations.timeToGoal.toFixed(1)} years`}
                    </p>
                  </div>
                )}
              </>
            )}

            {calculations.contribution === 0 && (
              <div className="bg-card/50 p-4 rounded-lg border border-border/50 text-center">
                <p className="text-muted-foreground text-sm">Enter a monthly contribution to see projections</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Button 
          onClick={handleSave} 
          className="w-full bg-gold hover:bg-gold/90 text-black font-bold"
          data-testid="button-save-settings"
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </Layout>
  );
}
