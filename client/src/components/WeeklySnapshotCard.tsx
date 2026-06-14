import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useWeeklySnapshots } from "@/hooks/use-snapshots";
import { Loader2, TrendingUp } from "lucide-react";

export function WeeklySnapshotCard() {
  const { data: snapshots, isLoading } = useWeeklySnapshots();

  const snapshot = snapshots?.[0];

  if (isLoading) {
    return (
      <Card className="border-border bg-card shadow-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-border bg-secondary/20">
          <CardTitle className="text-lg flex items-center gap-2 text-gold">
            <TrendingUp className="w-5 h-5" /> Weekly Cash Flow
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Loading...</CardDescription>
        </CardHeader>
        <CardContent className="p-6 flex items-center justify-center h-32">
          <Loader2 className="w-5 h-5 text-gold animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!snapshot) {
    return (
      <Card className="border-border bg-card shadow-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-border bg-secondary/20">
          <CardTitle className="text-lg flex items-center gap-2 text-gold">
            <TrendingUp className="w-5 h-5" /> Weekly Cash Flow
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">No snapshot data available</p>
        </CardContent>
      </Card>
    );
  }

  const income = parseFloat(snapshot.householdIncome);
  const expenses = parseFloat(snapshot.householdExpense);
  const debt = parseFloat(snapshot.debtPayment);
  const surplus = parseFloat(snapshot.surplus);

  return (
    <Card className="border-border bg-card shadow-2xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-border bg-secondary/20">
        <CardTitle className="text-lg flex items-center gap-2 text-gold">
          <TrendingUp className="w-5 h-5" /> Weekly Cash Flow
        </CardTitle>
        <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
          Week of {snapshot.weekStartDate}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Cash Flow Breakdown */}
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30 border border-border/50">
              <span className="text-sm font-medium text-foreground">Income</span>
              <span className="text-lg font-bold font-mono text-success">${income.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30 border border-border/50">
              <span className="text-sm font-medium text-foreground">Expenses</span>
              <span className="text-lg font-bold font-mono text-soft-red">${expenses.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30 border border-border/50">
              <span className="text-sm font-medium text-foreground">Debt Payments</span>
              <span className="text-lg font-bold font-mono text-warning">${debt.toFixed(2)}</span>
            </div>

            <div className="border-t border-border pt-3 mt-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-success/10 border border-success/30">
                <span className="text-sm font-bold text-success uppercase tracking-wider">Surplus (→ House Fund)</span>
                <span className="text-2xl font-bold font-mono text-success">${surplus.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Math Breakdown */}
          <div className="text-center pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground font-mono">
              ${income.toFixed(2)} - ${expenses.toFixed(2)} - ${debt.toFixed(2)} = <span className="text-success font-bold">${surplus.toFixed(2)}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
