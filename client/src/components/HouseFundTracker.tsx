import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAccountsWithBalances } from "@/hooks/use-accounts";
import { Loader2, Home, TrendingUp } from "lucide-react";

const HOUSE_FUND_GOAL = 2000;
const WEEKLY_SURPLUS = 131;
const START_DATE = new Date(2026, 5, 14); // June 14, 2026 (month is 0-indexed)
const TARGET_DEADLINE = new Date(2026, 7, 28); // Aug 28, 2026 (10 weeks from start)

export function HouseFundTracker() {
  const { data: accounts, isLoading } = useAccountsWithBalances();

  const houseFundAccount = accounts?.find(a => a.name === "House Fund");
  const currentBalance = houseFundAccount?.currentBalance ?? 0;
  const remaining = Math.max(0, HOUSE_FUND_GOAL - currentBalance);
  const weeksToGoal = remaining > 0 ? Math.ceil(remaining / WEEKLY_SURPLUS) : 0;
  const progressPercent = Math.min(100, (currentBalance / HOUSE_FUND_GOAL) * 100);

  const today = new Date();
  const targetDate = new Date(today.getTime() + weeksToGoal * 7 * 24 * 60 * 60 * 1000);
  const monthsAway = (weeksToGoal / 4.33).toFixed(1);

  // Calculate on-track status against deadline
  const totalDays = (TARGET_DEADLINE.getTime() - START_DATE.getTime()) / (1000 * 60 * 60 * 24);
  const totalWeeks = Math.ceil(totalDays / 7);
  const daysElapsed = Math.max(0, (today.getTime() - START_DATE.getTime()) / (1000 * 60 * 60 * 24));
  const weeksElapsed = Math.max(0, daysElapsed / 7);

  // Expected balance = what we should have accumulated by today if maintaining $131/week
  const expectedBalance = Math.min(HOUSE_FUND_GOAL, weeksElapsed * WEEKLY_SURPLUS);
  const isOnTrack = currentBalance >= expectedBalance * 0.95; // Allow 5% margin for variability
  const statusColor = isOnTrack ? "text-success" : "text-soft-red";
  const statusText = isOnTrack ? "On track" : "Behind pace";

  if (isLoading) {
    return (
      <Card className="border-border bg-card shadow-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-border bg-secondary/20">
          <CardTitle className="text-lg flex items-center gap-2 text-gold">
            <Home className="w-5 h-5" /> House Fund Progress
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Loading...</CardDescription>
        </CardHeader>
        <CardContent className="p-6 flex items-center justify-center h-32">
          <Loader2 className="w-5 h-5 text-gold animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card shadow-2xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-border bg-secondary/20">
        <CardTitle className="text-lg flex items-center gap-2 text-gold">
          <Home className="w-5 h-5" /> House Fund Progress
        </CardTitle>
        <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
          3-acre land + manufactured home (USDA loan eligible)
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Goal & Current */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Goal</p>
            <p className="text-2xl font-bold font-display text-foreground">${HOUSE_FUND_GOAL.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-lg bg-success/10 border border-success/30">
            <p className="text-xs font-bold text-success uppercase tracking-wider mb-1">Current</p>
            <p className="text-2xl font-bold font-display text-success">${currentBalance.toFixed(2)}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Progress</p>
            <p className="text-xs font-bold text-foreground">{progressPercent.toFixed(1)}%</p>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden border border-border/50">
            <div
              className="h-full bg-gradient-to-r from-success to-gold transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Remaining & Rate */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Remaining</p>
            <p className="text-xl font-bold font-mono text-foreground">${remaining.toFixed(2)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Weekly Rate</p>
            <p className="text-xl font-bold font-mono text-gold">${WEEKLY_SURPLUS}/week</p>
          </div>
        </div>

        {/* ETA */}
        <div className="p-4 rounded-lg bg-secondary/20 border border-border/50 space-y-2">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Timeline to Goal</p>
              <p className="text-2xl font-bold font-display text-foreground">{weeksToGoal} weeks</p>
              <p className="text-xs text-muted-foreground">≈ {monthsAway} months</p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Target Date</p>
              <p className={`text-lg font-bold font-mono ${statusColor}`}>
                {targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
              <p className={`text-xs font-bold uppercase tracking-wider ${statusColor}`}>{statusText}</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="p-3 rounded-lg bg-muted/20 border border-border/50 text-center">
          <p className="text-xs text-muted-foreground font-mono">
            {remaining > 0
              ? `At $${WEEKLY_SURPLUS}/week, you'll reach $${HOUSE_FUND_GOAL} by ${targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
              : "🎉 House Fund goal reached!"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
