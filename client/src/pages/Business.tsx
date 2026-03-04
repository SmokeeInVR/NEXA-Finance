import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { 
  useBusinessExpenses, useCreateBusinessExpense, useDeleteBusinessExpense, 
  useMileageEntries, useCreateMileageEntry, useDeleteMileageEntry,
  useBusinessIncome, useCreateBusinessIncome, useDeleteBusinessIncome,
  useBusinessSettings, useUpdateBusinessSettings
} from "@/hooks/use-business";
import { useAccountsWithBalances } from "@/hooks/use-accounts";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  insertBusinessExpenseSchema, insertMileageEntrySchema, insertBusinessIncomeLogSchema,
  type InsertBusinessExpense, type InsertMileageEntry, type InsertBusinessIncomeLog
} from "@shared/schema";
import { 
  Plus, Trash2, DollarSign, Receipt, Car, TrendingUp, 
  Loader2, Calculator, ChevronDown, ChevronUp, PiggyBank, ArrowRight
} from "lucide-react";
import { format, startOfMonth, subDays, startOfYear, parseISO, isWithinInterval } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";

function usePeriodTotals(items: { date: string; amount?: string | number; miles?: string | number | null }[] | undefined, field: 'amount' | 'miles') {
  return useMemo(() => {
    if (!items) return { thisMonth: 0, last30: 0, ytd: 0 };
    const now = new Date();
    const monthStart = startOfMonth(now);
    const thirtyDaysAgo = subDays(now, 30);
    const yearStart = startOfYear(now);
    let thisMonth = 0, last30 = 0, ytd = 0;
    items.forEach(item => {
      const date = parseISO(item.date);
      const value = field === 'amount' 
        ? parseFloat(String(item.amount || 0))
        : parseFloat(String(item.miles || 0));
      if (isWithinInterval(date, { start: monthStart, end: now })) thisMonth += value;
      if (isWithinInterval(date, { start: thirtyDaysAgo, end: now })) last30 += value;
      if (isWithinInterval(date, { start: yearStart, end: now })) ytd += value;
    });
    return { thisMonth, last30, ytd };
  }, [items, field]);
}

// Compact summary header
function SummaryHeader({ incomeTotals, expenseTotals, estimatedTax }: { 
  incomeTotals: { ytd: number }; 
  expenseTotals: { ytd: number }; 
  estimatedTax: number;
}) {
  const net = incomeTotals.ytd - expenseTotals.ytd - estimatedTax;
  return (
    <div className="grid grid-cols-2 gap-2 mb-4">
      <div className="bg-success/10 rounded-lg p-3 border border-success/20">
        <p className="text-[9px] font-bold uppercase text-muted-foreground">Income YTD</p>
        <p data-testid="glance-income-ytd" className="text-lg font-bold font-mono text-success">${incomeTotals.ytd.toLocaleString()}</p>
      </div>
      <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
        <p className="text-[9px] font-bold uppercase text-muted-foreground">Est. Taxes</p>
        <p data-testid="glance-taxes-ytd" className="text-lg font-bold font-mono text-amber-500">${estimatedTax.toLocaleString()}</p>
      </div>
    </div>
  );
}

// Compact section component
function Section({ 
  icon: Icon, 
  title, 
  color, 
  ytd, 
  unit = "$",
  onAdd, 
  addLabel,
  children,
  testId
}: { 
  icon: any; 
  title: string; 
  color: string; 
  ytd: number; 
  unit?: string;
  onAdd: () => void; 
  addLabel: string;
  children?: React.ReactNode;
  testId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="border-border">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${color}`} />
            <span className="font-medium text-sm">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <span data-testid={testId} className={`font-bold font-mono text-sm ${color}`}>
              {unit === "$" ? "$" : ""}{ytd.toLocaleString()}{unit !== "$" ? ` ${unit}` : ""}
            </span>
            <Button data-testid={`button-add-${title.toLowerCase().replace(' ', '-')}`} size="sm" variant="outline" onClick={onAdd}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>
        {children && (
          <>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs text-muted-foreground py-1"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
              {expanded ? "Hide" : "Details"}
            </Button>
            {expanded && <div className="mt-2">{children}</div>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Income Dialog
function IncomeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createIncome = useCreateBusinessIncome();
  const { toast } = useToast();
  const form = useForm<InsertBusinessIncomeLog>({
    resolver: zodResolver(insertBusinessIncomeLogSchema),
    defaultValues: { date: format(new Date(), "yyyy-MM-dd"), amount: "", note: "" },
  });

  const onSubmit = async (data: InsertBusinessIncomeLog) => {
    try {
      await createIncome.mutateAsync(data);
      onOpenChange(false);
      form.reset({ date: format(new Date(), "yyyy-MM-dd"), amount: "", note: "" });
      toast({ title: "Income added" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Log Income</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Date</FormLabel>
                  <FormControl><Input data-testid="input-income-date" type="date" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                      <Input data-testid="input-income-amount" type="number" step="0.01" className="pl-7" placeholder="0" {...field} />
                    </div>
                  </FormControl>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="note" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Note</FormLabel>
                <FormControl><Input data-testid="input-income-note" placeholder="Optional" {...field} value={field.value || ""} /></FormControl>
              </FormItem>
            )} />
            <Button data-testid="button-submit-income" type="submit" disabled={createIncome.isPending} className="w-full">
              {createIncome.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Save
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Expense Dialog
function ExpenseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createExpense = useCreateBusinessExpense();
  const { toast } = useToast();
  const form = useForm<InsertBusinessExpense>({
    resolver: zodResolver(insertBusinessExpenseSchema),
    defaultValues: { date: format(new Date(), "yyyy-MM-dd"), vendor: "", category: "", amount: "", notes: "" },
  });

  const onSubmit = async (data: InsertBusinessExpense) => {
    try {
      await createExpense.mutateAsync(data);
      onOpenChange(false);
      form.reset({ date: format(new Date(), "yyyy-MM-dd"), vendor: "", category: "", amount: "", notes: "" });
      toast({ title: "Expense added" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Log Expense</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Date</FormLabel>
                  <FormControl><Input data-testid="input-expense-date" type="date" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                      <Input data-testid="input-expense-amount" type="number" step="0.01" className="pl-7" placeholder="0" {...field} />
                    </div>
                  </FormControl>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="vendor" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Vendor</FormLabel>
                <FormControl><Input data-testid="input-expense-vendor" placeholder="e.g. Amazon" {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Category</FormLabel>
                <FormControl><Input data-testid="input-expense-category" placeholder="e.g. Supplies" {...field} /></FormControl>
              </FormItem>
            )} />
            <Button data-testid="button-submit-expense" type="submit" disabled={createExpense.isPending} className="w-full">
              {createExpense.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Save
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Mileage Dialog
const MILEAGE_PURPOSES = [
  "Client meeting",
  "Job site",
  "Supply run",
  "Bank / Post office",
  "Delivery",
  "Training / Conference",
  "Other",
];

function MileageDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createEntry = useCreateMileageEntry();
  const { toast } = useToast();
  const form = useForm<InsertMileageEntry>({
    resolver: zodResolver(insertMileageEntrySchema),
    defaultValues: { date: format(new Date(), "yyyy-MM-dd"), miles: "0", purpose: "" },
  });

  const onSubmit = async (data: InsertMileageEntry) => {
    try {
      await createEntry.mutateAsync({ ...data, startOdometer: null, endOdometer: null });
      onOpenChange(false);
      form.reset({ date: format(new Date(), "yyyy-MM-dd"), miles: "0", purpose: "" });
      toast({ title: "Trip logged" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Log Trip</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField control={form.control} name="date" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Date</FormLabel>
                <FormControl><Input data-testid="input-mileage-date" type="date" {...field} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="miles" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Miles</FormLabel>
                <FormControl>
                  <Input 
                    data-testid="input-mileage-miles" 
                    type="number" 
                    step="0.1" 
                    placeholder="e.g. 25"
                    {...field} 
                    onChange={e => field.onChange(e.target.value)}
                  />
                </FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="purpose" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Purpose</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-mileage-purpose">
                      <SelectValue placeholder="Select purpose" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MILEAGE_PURPOSES.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )} />
            <Button data-testid="button-submit-mileage" type="submit" disabled={createEntry.isPending} className="w-full">
              {createEntry.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Save
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Tax Settings
function TaxSettings({ taxPercent, onUpdate }: { taxPercent: number; onUpdate: (pct: string) => void }) {
  return (
    <div className="flex items-center justify-between bg-secondary/30 p-2 rounded-lg">
      <span className="text-xs text-muted-foreground">Tax Rate</span>
      <div className="flex gap-1">
        {[15, 20, 25, 30].map(pct => (
          <Button
            key={pct}
            data-testid={`button-tax-rate-${pct}`}
            variant={taxPercent === pct ? "default" : "ghost"}
            size="sm"
            className="px-2 text-xs"
            onClick={() => onUpdate(String(pct))}
          >
            {pct}%
          </Button>
        ))}
      </div>
    </div>
  );
}

// Entry list component
function EntryList({ 
  items, 
  renderItem, 
  emptyText 
}: { 
  items: any[] | undefined; 
  renderItem: (item: any) => React.ReactNode; 
  emptyText: string;
}) {
  if (!items?.length) return <p className="text-xs text-muted-foreground text-center py-2 italic">{emptyText}</p>;
  return (
    <div className="space-y-1 max-h-32 overflow-y-auto">
      {items.slice(0, 5).map(renderItem)}
    </div>
  );
}

export default function Business() {
  const { data: income } = useBusinessIncome();
  const { data: expenses } = useBusinessExpenses();
  const { data: mileage } = useMileageEntries();
  const { data: settings } = useBusinessSettings();
  const updateSettings = useUpdateBusinessSettings();
  const deleteIncome = useDeleteBusinessIncome();
  const deleteExpense = useDeleteBusinessExpense();
  const deleteMileage = useDeleteMileageEntry();
  const { toast } = useToast();
  
  const { data: accounts } = useAccountsWithBalances();
  const createTransaction = useCreateTransaction();

  const [incomeOpen, setIncomeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [mileageOpen, setMileageOpen] = useState(false);
  const [taxSetAsideOpen, setTaxSetAsideOpen] = useState(false);
  const [taxAmount, setTaxAmount] = useState("");

  const incomeTotals = usePeriodTotals(income, 'amount');
  const expenseTotals = usePeriodTotals(expenses, 'amount');
  const mileageTotals = usePeriodTotals(mileage, 'miles');
  
  const taxPercent = parseFloat(settings?.taxHoldPercent || "25");
  const estimatedTax = incomeTotals.ytd * (taxPercent / 100);
  const businessAccount = accounts?.find(a => a.name === "Business Checking");
  const taxSetAsideAccount = accounts?.find(a => a.name === "Tax Set-Aside");
  const taxesSetAside = taxSetAsideAccount?.currentBalance || 0;
  const progressPct = estimatedTax > 0 ? Math.min(100, (taxesSetAside / estimatedTax) * 100) : 0;
  const needMore = Math.max(0, estimatedTax - taxesSetAside);
  const IRS_RATE = 0.67;

  const handleUpdateTax = async (pct: string) => {
    try {
      await updateSettings.mutateAsync({ taxHoldPercent: pct });
      toast({ title: "Tax rate updated" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleSetAsideTax = async () => {
    const amount = parseFloat(taxAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Error", description: "Enter a valid amount", variant: "destructive" });
      return;
    }
    if (!businessAccount || !taxSetAsideAccount) {
      toast({ title: "Error", description: "Accounts not found", variant: "destructive" });
      return;
    }

    createTransaction.mutate(
      {
        date: format(new Date(), "yyyy-MM-dd"),
        type: "transfer",
        amount: taxAmount,
        fromAccountId: businessAccount.id,
        toAccountId: taxSetAsideAccount.id,
        notes: "Tax set-aside transfer",
        createdBy: "Me",
      },
      {
        onSuccess: () => {
          toast({ title: "Success", description: `Set aside $${amount.toFixed(2)} for taxes` });
          setTaxSetAsideOpen(false);
          setTaxAmount("");
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <Layout title="Business">
      <div className="space-y-3">
        <SummaryHeader incomeTotals={incomeTotals} expenseTotals={expenseTotals} estimatedTax={estimatedTax} />

        {/* Tax Progress */}
        <Card className="border-border">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium">Tax Set-Aside</span>
              </div>
              <div className="flex items-center gap-2">
                <span data-testid="tax-set-aside-progress-pct" className="text-xs font-mono text-amber-500">{progressPct.toFixed(0)}%</span>
                <Button
                  data-testid="button-set-aside-tax"
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => {
                    setTaxAmount(needMore > 0 ? needMore.toFixed(2) : "");
                    setTaxSetAsideOpen(true);
                  }}
                >
                  <PiggyBank className="w-3 h-3 mr-1" /> Set Aside
                </Button>
              </div>
            </div>
            <Progress data-testid="tax-progress-bar" value={progressPct} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Saved: <span className="text-foreground font-mono">${taxesSetAside.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></span>
              <span>Need: <span className="text-amber-500 font-mono">${needMore.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></span>
            </div>
            {businessAccount && (
              <div className="flex items-center justify-between text-xs bg-secondary/30 p-2 rounded">
                <span className="text-muted-foreground">Business Checking:</span>
                <span className="font-mono text-foreground">${businessAccount.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <TaxSettings taxPercent={taxPercent} onUpdate={handleUpdateTax} />
          </CardContent>
        </Card>

        {/* Income Section */}
        <Section 
          icon={TrendingUp} 
          title="Income" 
          color="text-success" 
          ytd={incomeTotals.ytd}
          onAdd={() => setIncomeOpen(true)}
          addLabel="Add"
          testId="income-ytd"
        >
          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
            <div className="bg-secondary/30 rounded p-2 text-center">
              <p className="text-muted-foreground">This Month</p>
              <p data-testid="income-this-month" className="font-mono font-bold text-success">${incomeTotals.thisMonth.toLocaleString()}</p>
            </div>
            <div className="bg-secondary/30 rounded p-2 text-center">
              <p className="text-muted-foreground">Last 30 Days</p>
              <p data-testid="income-last-30" className="font-mono font-bold text-success">${incomeTotals.last30.toLocaleString()}</p>
            </div>
          </div>
          <EntryList 
            items={income} 
            emptyText="No income logged"
            renderItem={item => (
              <div key={item.id} className="flex justify-between items-center text-xs bg-secondary/20 p-2 rounded">
                <span className="text-muted-foreground">{item.date} {item.note && `- ${item.note}`}</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-success">${parseFloat(item.amount).toLocaleString()}</span>
                  <Button variant="ghost" size="icon" onClick={() => deleteIncome.mutate(item.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          />
        </Section>

        {/* Expenses Section */}
        <Section 
          icon={Receipt} 
          title="Expenses" 
          color="text-destructive" 
          ytd={expenseTotals.ytd}
          onAdd={() => setExpenseOpen(true)}
          addLabel="Add"
          testId="expenses-ytd"
        >
          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
            <div className="bg-secondary/30 rounded p-2 text-center">
              <p className="text-muted-foreground">This Month</p>
              <p data-testid="expenses-this-month" className="font-mono font-bold text-destructive">${expenseTotals.thisMonth.toLocaleString()}</p>
            </div>
            <div className="bg-secondary/30 rounded p-2 text-center">
              <p className="text-muted-foreground">Last 30 Days</p>
              <p data-testid="expenses-last-30" className="font-mono font-bold text-destructive">${expenseTotals.last30.toLocaleString()}</p>
            </div>
          </div>
          <EntryList 
            items={expenses} 
            emptyText="No expenses logged"
            renderItem={exp => (
              <div key={exp.id} className="flex justify-between items-center text-xs bg-secondary/20 p-2 rounded">
                <span className="text-muted-foreground truncate max-w-[50%]">{exp.vendor} ({exp.category})</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-destructive">${parseFloat(exp.amount).toLocaleString()}</span>
                  <Button variant="ghost" size="icon" onClick={() => deleteExpense.mutate(exp.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          />
        </Section>

        {/* Mileage Section */}
        <Section 
          icon={Car} 
          title="Mileage" 
          color="text-primary" 
          ytd={mileageTotals.ytd}
          unit="mi"
          onAdd={() => setMileageOpen(true)}
          addLabel="Add"
          testId="mileage-ytd"
        >
          <div className="bg-gold/10 rounded p-2 text-center mb-2 border border-gold/20">
            <p className="text-[9px] text-muted-foreground uppercase">Est. Deduction @ ${IRS_RATE}/mi</p>
            <p data-testid="mileage-deduction" className="font-bold font-mono text-gold">${(mileageTotals.ytd * IRS_RATE).toLocaleString()}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
            <div className="bg-secondary/30 rounded p-2 text-center">
              <p className="text-muted-foreground">This Month</p>
              <p data-testid="mileage-this-month" className="font-mono font-bold text-primary">{mileageTotals.thisMonth.toLocaleString()} mi</p>
            </div>
            <div className="bg-secondary/30 rounded p-2 text-center">
              <p className="text-muted-foreground">Last 30 Days</p>
              <p data-testid="mileage-last-30" className="font-mono font-bold text-primary">{mileageTotals.last30.toLocaleString()} mi</p>
            </div>
          </div>
          <EntryList 
            items={mileage} 
            emptyText="No trips logged"
            renderItem={entry => (
              <div key={entry.id} className="flex justify-between items-center text-xs bg-secondary/20 p-2 rounded">
                <span className="text-muted-foreground truncate max-w-[50%]">{entry.purpose}</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-primary">{parseFloat(entry.miles || "0")} mi</span>
                  <Button variant="ghost" size="icon" onClick={() => deleteMileage.mutate(entry.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          />
        </Section>
      </div>

      <IncomeDialog open={incomeOpen} onOpenChange={setIncomeOpen} />
      <ExpenseDialog open={expenseOpen} onOpenChange={setExpenseOpen} />
      <MileageDialog open={mileageOpen} onOpenChange={setMileageOpen} />

      <Dialog open={taxSetAsideOpen} onOpenChange={setTaxSetAsideOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-amber-500 flex items-center gap-2">
              <PiggyBank className="w-5 h-5" /> Set Aside for Taxes
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between text-sm bg-secondary/30 p-3 rounded-lg">
              <span className="text-muted-foreground">From:</span>
              <span className="font-medium">Business Checking (${businessAccount?.currentBalance.toFixed(2) || "0.00"})</span>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex items-center justify-between text-sm bg-secondary/30 p-3 rounded-lg">
              <span className="text-muted-foreground">To:</span>
              <span className="font-medium">Tax Set-Aside (${taxesSetAside.toFixed(2)})</span>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Amount to Transfer</label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-muted-foreground text-lg">$</span>
                <Input
                  data-testid="input-tax-amount"
                  type="number"
                  step="0.01"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                  className="font-mono font-bold"
                  placeholder="0.00"
                />
              </div>
            </div>
            {needMore > 0 && (
              <Button
                data-testid="button-quick-fill-tax"
                variant="ghost"
                size="sm"
                className="w-full text-xs text-amber-500"
                onClick={() => setTaxAmount(needMore.toFixed(2))}
              >
                Quick Fill: ${needMore.toFixed(2)} needed
              </Button>
            )}
            <Button
              data-testid="button-confirm-tax-transfer"
              onClick={handleSetAsideTax}
              disabled={createTransaction.isPending}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
            >
              {createTransaction.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PiggyBank className="w-4 h-4 mr-2" />}
              Transfer to Tax Set-Aside
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
