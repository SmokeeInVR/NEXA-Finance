import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, DollarSign, AlertTriangle, Target } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { SpendingLog } from "@shared/schema";

const THIS_WEEK_INCOME = 670;
const ANNUAL_PACE_TARGET = 670 * 52;
const TAX_RATE = 0.15;
const BUSINESS_DEBT_FREE_DATE = new Date(2027, 0, 1);

export default function Business() {
  const { data: spendingLogs } = useQuery<SpendingLog[]>({ queryKey: ["/api/spending"] });

  const businessExpenses = spendingLogs?.filter(s => ["Gas / Fuel"].includes(s.category)) || [];
  const thisWeekExpenses = businessExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const monthlyAvgExpenses = thisWeekExpenses * 4.33;

  const taxSetAside = THIS_WEEK_INCOME * TAX_RATE;
  const afterTaxIncome = THIS_WEEK_INCOME - taxSetAside;
  const quarterlyTaxEst = THIS_WEEK_INCOME * 13 * TAX_RATE;
  const nextQuarterDue = new Date(2026, 8, 15);

  const debtPaymentsWeekly = 161;

  const today = new Date();
  const daysToDebtFree = Math.max(0, (BUSINESS_DEBT_FREE_DATE.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const monthsToDebtFree = (daysToDebtFree / 30).toFixed(1);

  return (
    <Layout title="Business">
      <div className="space-y-6">
        <Card className="border-border bg-card shadow-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-secondary/20">
            <CardTitle className="text-lg flex items-center gap-2 text-gold">
              <DollarSign className="w-5 h-5" /> Income & Pace
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
              Inspection work tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">This Week</p>
                <p className="text-3xl font-bold font-display text-success">${THIS_WEEK_INCOME}</p>
                <p className="text-xs text-muted-foreground mt-1">Inspections</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Monthly Avg</p>
                <p className="text-3xl font-bold font-display text-foreground">${(THIS_WEEK_INCOME * 4.33).toFixed(0)}</p>
                <p className="text-xs text-muted-foreground mt-1">~4 weeks</p>
              </div>
              <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                <p className="text-xs font-bold text-success uppercase tracking-wider mb-2">Annual Pace</p>
                <p className="text-3xl font-bold font-display text-success">${ANNUAL_PACE_TARGET.toLocaleString()}</p>
                <p className="text-xs text-success mt-1">If sustained</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-secondary/20 border border-border/50">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-foreground uppercase tracking-wider">Trend</p>
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <p className="text-xs text-muted-foreground">
                At $670/week consistent pace, you will generate ${ANNUAL_PACE_TARGET.toLocaleString()} annually before taxes.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-secondary/20">
            <CardTitle className="text-lg flex items-center gap-2 text-gold">
              <AlertTriangle className="w-5 h-5" /> Business Expenses
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
              Tracked separately from household
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">This Week</p>
                <p className="text-2xl font-bold font-mono text-foreground">${thisWeekExpenses.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">Gas / Travel</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Monthly Est</p>
                <p className="text-2xl font-bold font-mono text-foreground">${monthlyAvgExpenses.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">Recurring avg</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-secondary/20 border border-border/50 text-sm">
              <p className="text-xs text-muted-foreground uppercase font-bold mb-2">Deductible Categories</p>
              <ul className="space-y-1 text-xs text-foreground">
                <li>✓ Gas / Fuel for inspections</li>
                <li>✓ Vehicle maintenance (mileage tracking)</li>
                <li>✓ Tools and equipment</li>
                <li>✓ Training / certifications</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-secondary/20">
            <CardTitle className="text-lg flex items-center gap-2 text-gold">
              <Target className="w-5 h-5" /> Tax Strategy
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
              Self-employed planning (1099)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Gross This Week</p>
                <p className="text-2xl font-bold font-mono text-foreground">${THIS_WEEK_INCOME.toFixed(2)}</p>
              </div>
              <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
                <p className="text-xs font-bold text-warning uppercase tracking-wider mb-2">Tax Set-Aside (15 percent)</p>
                <p className="text-2xl font-bold font-mono text-warning">${taxSetAside.toFixed(2)}</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-success/10 border border-success/30">
              <p className="text-xs font-bold text-success uppercase tracking-wider mb-2">After-Tax Income (Net)</p>
              <p className="text-3xl font-bold font-display text-success">${afterTaxIncome.toFixed(2)}/week</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Q3 Tax Est Due</p>
                <p className="text-lg font-bold text-foreground">${quarterlyTaxEst.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">${nextQuarterDue.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Annual Tax (Est)</p>
                <p className="text-lg font-bold text-foreground">${(THIS_WEEK_INCOME * 52 * TAX_RATE).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">Before refunds</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-secondary/20 border border-border/50 text-sm">
              <p className="text-xs text-muted-foreground uppercase font-bold mb-2">Recommendation</p>
              <p className="text-xs text-foreground">
                Set aside 15 percent of gross income weekly for federal taxes. File quarterly estimated payments to avoid penalties. Track mileage and business expenses for deductions.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-secondary/20">
            <CardTitle className="text-lg flex items-center gap-2 text-gold">
              <TrendingUp className="w-5 h-5" /> House Fund Capacity
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
              After debt elimination
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Debt-Free Target</p>
              <p className="text-2xl font-bold font-display text-foreground">Jan 1, 2027</p>
              <p className="text-xs text-muted-foreground mt-1">~${monthsToDebtFree} months away</p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-secondary/20 border border-border/50">
                <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Current Allocation</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Household bills</span>
                    <span className="font-mono text-foreground">$599/wk</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Debt payments</span>
                    <span className="font-mono text-foreground">$161/wk</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Business expenses</span>
                    <span className="font-mono text-foreground">${thisWeekExpenses.toFixed(2)}/wk</span>
                  </div>
                  <div className="border-t border-border/50 pt-2 flex justify-between font-bold">
                    <span className="text-foreground">Available for house fund</span>
                    <span className="font-mono text-gold">$131/wk</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                <p className="text-xs font-bold text-success uppercase tracking-wider mb-3">After Debt-Free (Jan 2027)</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-foreground">Freed from debt payments</span>
                    <span className="font-mono text-success font-bold">+$161/wk</span>
                  </div>
                  <div className="border-t border-success/30 pt-2 flex justify-between font-bold">
                    <span className="text-success">New house fund rate</span>
                    <span className="font-mono text-success text-lg">$292/wk</span>
                  </div>
                  <div className="text-xs text-success mt-2">
                    = ${(292 * 52).toLocaleString()}/year to house fund
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/20 border border-border/50 text-center text-xs text-muted-foreground">
              Once debt-free, you will accelerate house fund from $131/week to $292/week.
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
