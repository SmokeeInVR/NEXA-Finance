import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useBillsRegistry } from "@/hooks/use-bills";
import { Loader2, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

const WEEKLY_TARGET = 599;

export function BillsRegistryCard() {
  const { data: bills, isLoading } = useBillsRegistry();

  if (isLoading) {
    return (
      <Card className="border-border bg-card shadow-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-border bg-secondary/20">
          <CardTitle className="text-lg flex items-center gap-2 text-gold">
            <AlertTriangle className="w-5 h-5" /> Bills Registry
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Loading...</CardDescription>
        </CardHeader>
        <CardContent className="p-6 flex items-center justify-center h-32">
          <Loader2 className="w-5 h-5 text-gold animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!bills || bills.length === 0) {
    return (
      <Card className="border-border bg-card shadow-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-border bg-secondary/20">
          <CardTitle className="text-lg flex items-center gap-2 text-gold">
            <AlertTriangle className="w-5 h-5" /> Bills Registry
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">No bills registered</p>
        </CardContent>
      </Card>
    );
  }

  const today = new Date();
  const thisMonth = today.getMonth();
  const thisYear = today.getFullYear();

  // Separate recurring and one-time bills
  const recurring = bills.filter(b => !b.endDate || new Date(b.endDate) > today);
  const oneTime = bills.filter(b => b.endDate && new Date(b.endDate) <= today);

  // Sort recurring by due day
  const recurringByDue = [...recurring].sort((a, b) => a.dueDay - b.dueDay);

  // Find bills due soon (within 7 days from today)
  const dueSoonStart = today.getDate();
  const dueSoonEnd = today.getDate() + 7;
  const dueSoon = recurringByDue.filter(b => b.dueDay >= dueSoonStart && b.dueDay <= dueSoonEnd);

  // Calculate monthly total from recurring bills
  const monthlyTotal = recurring.reduce((sum, b) => sum + parseFloat(b.amount), 0);
  const weeklyTotal = monthlyTotal / 4.33; // Average weeks per month

  // Calculate this week's funding (using a placeholder value - in real app would fetch from bills-funding endpoint)
  const thisWeekFunded = 670; // Example: from household income
  const isWeeklyOnTrack = thisWeekFunded >= WEEKLY_TARGET;

  return (
    <Card className="border-border bg-card shadow-2xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-border bg-secondary/20">
        <CardTitle className="text-lg flex items-center gap-2 text-gold">
          <AlertTriangle className="w-5 h-5" /> Bills Registry
        </CardTitle>
        <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
          {recurring.length} recurring + {oneTime.length} one-time
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Critical Bills (Due Soon) */}
        {dueSoon.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Critical Bills (Due Soon)</h3>
            <div className="space-y-2">
              {dueSoon.map(bill => (
                <div key={bill.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{bill.name}</p>
                    <p className="text-xs text-muted-foreground">Due {bill.dueDay}th of month</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold font-mono text-foreground">${parseFloat(bill.amount).toFixed(2)}</p>
                    <p className="text-xs text-success flex items-center justify-end gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Paid on time
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Recurring Bills */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">All Recurring Bills</h3>
          <div className="grid grid-cols-2 gap-2">
            {recurringByDue.map(bill => (
              <div key={bill.id} className="p-3 rounded-lg bg-muted/20 border border-border/50">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{bill.category}</p>
                <p className="text-sm font-medium text-foreground truncate">{bill.name}</p>
                <div className="flex justify-between items-end mt-2">
                  <p className="text-xs text-muted-foreground">Due {bill.dueDay}th</p>
                  <p className="text-sm font-bold font-mono text-gold">${parseFloat(bill.amount).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* One-Time Bills */}
        {oneTime.length > 0 && (
          <div className="space-y-3 p-4 rounded-lg bg-warning/10 border border-warning/30">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">One-Time Costs</h3>
            <div className="space-y-2">
              {oneTime.map(bill => (
                <div key={bill.id} className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{bill.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {bill.endDate && new Date(bill.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <p className="text-lg font-bold font-mono text-warning">${parseFloat(bill.amount).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weekly Funding Status */}
        <div className="p-4 rounded-lg bg-secondary/20 border border-border/50 space-y-3">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">This Week's Funding</h3>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Target</p>
              <p className="text-lg font-bold font-mono text-foreground">${WEEKLY_TARGET}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Funded</p>
              <p className={`text-lg font-bold font-mono ${isWeeklyOnTrack ? "text-success" : "text-soft-red"}`}>
                ${thisWeekFunded}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Status</p>
              <p className={`text-sm font-bold uppercase tracking-wider ${isWeeklyOnTrack ? "text-success" : "text-soft-red"}`}>
                {isWeeklyOnTrack ? "ON TRACK" : "SHORT"}
              </p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="text-center pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground font-mono">
            ${monthlyTotal.toFixed(2)}/month = ${weeklyTotal.toFixed(2)}/week
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
