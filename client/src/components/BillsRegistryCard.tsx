import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBillsRegistry } from "@/hooks/use-bills";
import { AlertTriangle, CalendarClock, Loader2, TimerReset } from "lucide-react";

function formatMoney(amount: number) {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizeDate(value: string | Date) {
  const parsed = new Date(value);
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function getNextOccurrence(dueDay: number, reference: Date) {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const thisMonth = new Date(year, month, dueDay);
  if (thisMonth >= reference) return thisMonth;
  return new Date(year, month + 1, dueDay);
}

export function BillsRegistryCard() {
  const { data: bills, isLoading, error } = useBillsRegistry();

  if (isLoading) {
    return (
      <Card className="border-border bg-card shadow-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-border bg-secondary/20">
          <CardTitle className="text-lg flex items-center gap-2 text-gold">
            <AlertTriangle className="w-5 h-5" /> Bills Registry
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
            Loading bill obligations
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
            <AlertTriangle className="w-5 h-5" /> Bills Registry
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
            Planning obligations
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-2">
          <p className="text-sm text-soft-red font-medium">Unable to load bills registry data.</p>
          <p className="text-xs text-muted-foreground">{error.message}</p>
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
          <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
            Planning obligations
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">No bills are registered yet.</p>
        </CardContent>
      </Card>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const oneTime = bills
    .filter((bill) => bill.endDate && bill.startDate === bill.endDate)
    .sort((a, b) => normalizeDate(a.endDate as string).getTime() - normalizeDate(b.endDate as string).getTime());

  const recurring = bills.filter((bill) => !(bill.endDate && bill.startDate === bill.endDate));
  const activeRecurring = recurring
    .filter((bill) => {
      const startDate = normalizeDate(bill.startDate);
      const endDate = bill.endDate ? normalizeDate(bill.endDate) : null;
      return startDate <= today && (!endDate || endDate >= today);
    })
    .sort((a, b) => a.dueDay - b.dueDay);

  const futureRecurring = recurring
    .filter((bill) => normalizeDate(bill.startDate) > today)
    .sort((a, b) => normalizeDate(a.startDate).getTime() - normalizeDate(b.startDate).getTime());

  const dueSoon = activeRecurring
    .map((bill) => {
      const nextDueDate = getNextOccurrence(bill.dueDay, today);
      const daysUntil = Math.ceil((nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { bill, nextDueDate, daysUntil };
    })
    .filter(({ daysUntil }) => daysUntil >= 0 && daysUntil <= 7)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const activeMonthlyRecurring = activeRecurring.reduce((sum, bill) => sum + parseFloat(bill.amount), 0);
  const activeWeeklyRecurring = activeMonthlyRecurring / 4.33;
  const futureMonthlyRecurring = futureRecurring.reduce((sum, bill) => sum + parseFloat(bill.amount), 0);
  const dueSoonTotal = dueSoon.reduce((sum, item) => sum + parseFloat(item.bill.amount), 0);
  const oneTimeUpcomingTotal = oneTime
    .filter((bill) => normalizeDate(bill.endDate as string) >= today)
    .reduce((sum, bill) => sum + parseFloat(bill.amount), 0);

  return (
    <Card className="border-border bg-card shadow-2xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-border bg-secondary/20">
        <CardTitle className="text-lg flex items-center gap-2 text-gold">
          <AlertTriangle className="w-5 h-5" /> Bills Registry
        </CardTitle>
        <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
          Current obligations first, future move costs separated cleanly
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active / month</p>
            <p className="mt-1 text-xl font-bold font-mono text-foreground">${formatMoney(activeMonthlyRecurring)}</p>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active / week</p>
            <p className="mt-1 text-xl font-bold font-mono text-gold">${formatMoney(activeWeeklyRecurring)}</p>
          </div>
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-warning">Due next 7 days</p>
            <p className="mt-1 text-xl font-bold font-mono text-warning">${formatMoney(dueSoonTotal)}</p>
          </div>
        </div>

        {dueSoon.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-gold" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Coming due</h3>
            </div>
            <div className="space-y-2">
              {dueSoon.map(({ bill, nextDueDate, daysUntil }) => (
                <div key={bill.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{bill.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {bill.category} • due {nextDueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold font-mono text-foreground">${formatMoney(parseFloat(bill.amount))}</p>
                    <p className="text-xs text-warning font-medium">
                      {daysUntil === 0 ? "Due today" : `${daysUntil} day${daysUntil === 1 ? "" : "s"} away`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Active recurring bills</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {activeRecurring.map((bill) => (
              <div key={bill.id} className="p-3 rounded-lg bg-muted/20 border border-border/50">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{bill.category}</p>
                <p className="text-sm font-medium text-foreground">{bill.name}</p>
                <div className="flex justify-between items-end mt-2">
                  <p className="text-xs text-muted-foreground">Due day {bill.dueDay}</p>
                  <p className="text-sm font-bold font-mono text-gold">${formatMoney(parseFloat(bill.amount))}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {futureRecurring.length > 0 && (
          <div className="space-y-3 rounded-lg border border-gold/30 bg-gold/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <TimerReset className="w-4 h-4 text-gold" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Future recurring after move</h3>
              </div>
              <p className="text-xs font-bold font-mono text-gold">${formatMoney(futureMonthlyRecurring)} / month</p>
            </div>
            <div className="space-y-2">
              {futureRecurring.map((bill) => (
                <div key={bill.id} className="flex justify-between items-center rounded-lg border border-border/40 bg-background/40 p-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{bill.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Starts {normalizeDate(bill.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <p className="text-lg font-bold font-mono text-gold">${formatMoney(parseFloat(bill.amount))}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {oneTime.length > 0 && (
          <div className="space-y-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">One-time move costs</h3>
              <p className="text-xs font-bold font-mono text-warning">${formatMoney(oneTimeUpcomingTotal)} upcoming</p>
            </div>
            <div className="space-y-2">
              {oneTime.map((bill) => (
                <div key={bill.id} className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{bill.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(bill.endDate as string).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <p className="text-lg font-bold font-mono text-warning">${formatMoney(parseFloat(bill.amount))}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
          <p className="text-xs text-muted-foreground">
            The active monthly total reflects the current lease. Future apartment rent and move-in costs stay visible,
            but they do not inflate today&apos;s baseline until their start date arrives.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
