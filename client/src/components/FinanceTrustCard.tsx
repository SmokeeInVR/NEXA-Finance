import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinanceTrustSummary } from "@/hooks/use-finance-trust";

const money = (value: number | null | undefined) => value == null ? "Not available" : `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function FinanceTrustCard() {
  const { data, isLoading, isError } = useFinanceTrustSummary();

  if (isLoading) return <Card className="border-border bg-card/70"><CardContent className="p-5 text-sm text-muted-foreground">Loading protected cash plan…</CardContent></Card>;
  if (isError || !data) return <Card className="border-destructive/40 bg-card/70"><CardContent className="p-5 text-sm text-destructive">Finance trust summary unavailable. No payment recommendation was made.</CardContent></Card>;

  const variableLabels = [
    ["Groceries", data.variable.groceries],
    ["Fuel / Gas", data.variable.fuel],
  ] as const;

  return (
    <Card className="border-border bg-card/70 shadow-lg" data-testid="finance-trust-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-gold"><ShieldCheck className="h-5 w-5" /> Trust foundation</CardTitle>
        <p className="text-xs text-muted-foreground">Server-derived planning truth. Recommendations are read-only.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Recurring monthly</p><p className="font-mono font-bold">{money(data.obligations.recurringMonthly)}</p></div>
          <div><p className="text-[10px] uppercase tracking-widest text-muted-foreground">One-time upcoming</p><p className="font-mono font-bold">{money(data.obligations.oneTimeUpcoming)}</p></div>
          <div><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Cash required this period</p><p className="font-mono font-bold text-gold">{money(data.obligations.cashRequiredThisPeriod)}</p></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {variableLabels.map(([label, policy]) => (
            <div key={label} className="rounded-lg border border-border/70 p-3">
              <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{label}</p><span className="text-xs text-muted-foreground">{policy.sampleCount} samples · {policy.trend}</span></div>
              <p className="mt-1 font-mono font-bold">{money(policy.target)} <span className="font-sans text-xs font-normal text-muted-foreground">weekly policy</span></p>
              <p className="mt-1 text-xs text-muted-foreground">{policy.sufficientHistory ? `${policy.method.replaceAll("_", " ")} · ${policy.lookbackWeeks}-week lookback` : `Insufficient history: ${policy.sampleCount}/${policy.minimumSamples} finalized samples in the ${policy.lookbackWeeks}-week lookback. Set a temporary target in Settings.`}</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <span>Actual {money(policy.currentActual)}</span><span>Expected {money(policy.expectedToDate)}</span><span>Remaining {money(policy.remaining)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Variance to date: {money(policy.variance)} · finalized/deduplicated transactions · current period</p>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-border/70 p-3 text-xs">
          <p className="font-semibold">Personal flex this period</p>
          <p className="text-muted-foreground">Protected after essentials: {money(data.personalFlex.householdBudget)} ({data.personalFlex.percent}%). Me {money(data.personalFlex.meShare)} · Spouse {money(data.personalFlex.spouseShare)}. Current personal spending: Me {money(data.personalFlex.currentPeriodSpending.me)} · Spouse {money(data.personalFlex.currentPeriodSpending.spouse)}.</p>
          <p className="mt-1 text-muted-foreground">Remaining personal flex: {money(data.personalFlex.remaining)}{data.personalFlex.safeSurplusBeforePersonalFlex === 0 ? ". There is no safe surplus after essentials right now." : "."}</p>
        </div>
        <div className="rounded-lg border border-gold/40 bg-gold/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Available for extra non-car debt payoff</p><p className="text-2xl font-bold text-gold">{money(data.debtPlan.safeExtraPayment)}</p></div>
            {data.debtPlan.targetDebt && <div className="text-right"><p className="text-xs text-muted-foreground">Avalanche target</p><p className="font-semibold">{data.debtPlan.targetDebt.name}</p><p className="text-xs text-muted-foreground">Non-car debt only</p></div>}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Protected before this recommendation: {money(data.debtPlan.protectedAmount)} for upcoming obligations, variable reserves, buffer floor, and remaining personal flex.</p>
          {data.debtPlan.blocking.length > 0 && <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5" /> {data.debtPlan.blocking.join("; ")}.</p>}
          <p className="mt-2 text-xs text-muted-foreground">Policy: {data.debtPlan.bufferProtectionPolicy}. Cars remain excluded by structured opt-out when available plus a provisional legacy name heuristic.</p>
          <p className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">No bank transfer, debt payment, or paid status mutation was initiated.</p>
        </div>
      </CardContent>
    </Card>
  );
}
