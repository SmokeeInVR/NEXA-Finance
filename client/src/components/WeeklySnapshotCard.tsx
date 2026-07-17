import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWeeklySnapshots } from "@/hooks/use-snapshots";
import { AlertTriangle, Loader2, TrendingUp } from "lucide-react";

export function WeeklySnapshotCard() {
  const { data: snapshots, isLoading, error } = useWeeklySnapshots();
  const snapshot = snapshots?.[0];

  if (isLoading) {
    return (
      <Card className="border-border bg-card shadow-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-border bg-secondary/20">
          <CardTitle className="text-lg flex items-center gap-2 text-gold">
            <TrendingUp className="w-5 h-5" /> Weekly Cash Flow
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
            Loading planning baseline
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 flex items-center justify-center h-32">
          <Loader2 className="w-5 h-5 text-gold animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error instanceof Error) {
    return (
      <Card className="border-border bg-card shadow-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-border bg-secondary/20">
          <CardTitle className="text-lg flex items-center gap-2 text-gold">
            <TrendingUp className="w-5 h-5" /> Weekly Cash Flow
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
            Planning baseline
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-2">
          <p className="text-sm text-soft-red font-medium">Unable to load weekly snapshot data.</p>
          <p className="text-xs text-muted-foreground">{error.message}</p>
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
          <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
            Planning baseline
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          <p className="text-sm text-muted-foreground">No weekly snapshot data is available yet.</p>
          <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
            <p className="text-xs text-muted-foreground">
              This is your planned weekly model for income, bills, debt, and surplus. It is separate from live bank
              balances.
            </p>
          </div>
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
          Planning baseline • Week of {snapshot.weekStartDate}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
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
                <span className="text-sm font-bold text-success uppercase tracking-wider">Surplus to house fund</span>
                <span className="text-2xl font-bold font-mono text-success">${surplus.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="text-center pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground font-mono">
              ${income.toFixed(2)} - ${expenses.toFixed(2)} - ${debt.toFixed(2)} ={" "}
              <span className="text-success font-bold">${surplus.toFixed(2)}</span>
            </p>
          </div>

          <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
            <p className="text-xs text-muted-foreground flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 text-gold shrink-0" />
              This is your planning snapshot. Use the Live Bank Snapshot card for the actual balance picture.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
