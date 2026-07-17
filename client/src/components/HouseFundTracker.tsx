import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccountsWithBalances } from "@/hooks/use-accounts";
import { useWeeklySnapshots } from "@/hooks/use-snapshots";
import { Home, Loader2 } from "lucide-react";

const HOUSE_FUND_GOAL = 2000;
const FALLBACK_WEEKLY_SURPLUS = 131;
const START_DATE = new Date(2026, 5, 14);
const TARGET_WINDOW = "2027-2028";

export function HouseFundTracker() {
  const { data: accounts, isLoading: accountsLoading, error: accountsError } = useAccountsWithBalances();
  const { data: snapshots, isLoading: snapshotsLoading } = useWeeklySnapshots();

  const snapshotSurplus = snapshots?.[0] ? parseFloat(snapshots[0].surplus) : FALLBACK_WEEKLY_SURPLUS;
  const weeklySurplus = Number.isFinite(snapshotSurplus) && snapshotSurplus > 0 ? snapshotSurplus : FALLBACK_WEEKLY_SURPLUS;

  const houseFundAccount = accounts?.find((account) => account.name === "House Fund");
  const currentBalance = houseFundAccount?.currentBalance ?? 0;
  const remaining = Math.max(0, HOUSE_FUND_GOAL - currentBalance);
  const weeksToGoal = remaining > 0 ? Math.ceil(remaining / weeklySurplus) : 0;
  const progressPercent = Math.min(100, (currentBalance / HOUSE_FUND_GOAL) * 100);

  const today = new Date();
  const targetDate = new Date(today.getTime() + weeksToGoal * 7 * 24 * 60 * 60 * 1000);
  const monthsAway = (weeksToGoal / 4.33).toFixed(1);

  const daysElapsed = Math.max(0, (today.getTime() - START_DATE.getTime()) / (1000 * 60 * 60 * 24));
  const weeksElapsed = Math.max(0, daysElapsed / 7);
  const expectedBalance = Math.min(HOUSE_FUND_GOAL, weeksElapsed * weeklySurplus);
  const isOnTrack = currentBalance >= expectedBalance * 0.95;
  const statusColor = isOnTrack ? "text-success" : "text-soft-red";
  const statusText = isOnTrack ? "On track" : "Behind pace";

  if (accountsLoading || snapshotsLoading) {
    return (
      <Card className="border-border bg-card shadow-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-border bg-secondary/20">
          <CardTitle className="text-lg flex items-center gap-2 text-gold">
            <Home className="w-5 h-5" /> House Fund Progress
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
            Loading goal tracker
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 flex items-center justify-center h-32">
          <Loader2 className="w-5 h-5 text-gold animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (accountsError instanceof Error) {
    return (
      <Card className="border-border bg-card shadow-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-border bg-secondary/20">
          <CardTitle className="text-lg flex items-center gap-2 text-gold">
            <Home className="w-5 h-5" /> House Fund Progress
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
            Planning tracker
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-2">
          <p className="text-sm text-soft-red font-medium">Unable to load house fund account data.</p>
          <p className="text-xs text-muted-foreground">{accountsError.message}</p>
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
          Planning ledger target • live cash is shown separately
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Goal</p>
            <p className="text-2xl font-bold font-display text-foreground">${HOUSE_FUND_GOAL.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-lg bg-success/10 border border-success/30">
            <p className="text-xs font-bold text-success uppercase tracking-wider mb-1">Ledger balance</p>
            <p className="text-2xl font-bold font-display text-success">${currentBalance.toFixed(2)}</p>
          </div>
        </div>

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

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Remaining</p>
            <p className="text-xl font-bold font-mono text-foreground">${remaining.toFixed(2)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Weekly surplus</p>
            <p className="text-xl font-bold font-mono text-gold">${weeklySurplus.toFixed(2)}</p>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-secondary/20 border border-border/50 space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Timeline to goal</p>
              <p className="text-2xl font-bold font-display text-foreground">{weeksToGoal} weeks</p>
              <p className="text-xs text-muted-foreground">≈ {monthsAway} months</p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Target date</p>
              <p className={`text-lg font-bold font-mono ${statusColor}`}>
                {targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
              <p className={`text-xs font-bold uppercase tracking-wider ${statusColor}`}>{statusText}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
          <p className="text-xs text-muted-foreground">
            This uses the House Fund ledger account plus the latest weekly surplus model. It is a planning tracker, not a
            live checking-account balance. The target window is flexible and can slide across {TARGET_WINDOW} if that gets us a better monthly price.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
