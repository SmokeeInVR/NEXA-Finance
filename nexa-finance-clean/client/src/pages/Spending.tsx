import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccountsWithBalances } from "@/hooks/use-accounts";
import { useTransactions, useCreateTransaction, useDeleteTransaction } from "@/hooks/use-transactions";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Receipt, Trash2, Plus, Wallet } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { z } from "zod";

const spendFormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  amount: z.string().min(1, "Amount is required"),
  category: z.string().min(1, "Category is required"),
  fromAccountId: z.string().min(1, "Account is required"),
  notes: z.string().optional(),
});

type SpendFormData = z.infer<typeof spendFormSchema>;

export default function Spending() {
  const { toast } = useToast();
  const { data: accounts, isLoading: accountsLoading } = useAccountsWithBalances();
  const { data: transactions, isLoading: transactionsLoading } = useTransactions({ type: "spend" });
  const createTransaction = useCreateTransaction();
  const deleteTransaction = useDeleteTransaction();

  const checkingAccounts = accounts?.filter(a => ["personal", "spouse", "joint"].includes(a.type)) || [];
  const defaultAccountId = checkingAccounts.find(a => a.type === "joint")?.id || checkingAccounts[0]?.id;

  const form = useForm<SpendFormData>({
    resolver: zodResolver(spendFormSchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      amount: "",
      category: "Household / Misc",
      fromAccountId: defaultAccountId?.toString() || "",
      notes: "",
    },
  });

  const onSubmit = async (data: SpendFormData) => {
    createTransaction.mutate(
      {
        date: data.date,
        type: "spend",
        amount: data.amount,
        fromAccountId: parseInt(data.fromAccountId),
        category: data.category,
        notes: data.notes || undefined,
        createdBy: "Me",
      },
      {
        onSuccess: () => {
          form.reset({
            date: format(new Date(), "yyyy-MM-dd"),
            amount: "",
            category: "Household / Misc",
            fromAccountId: defaultAccountId?.toString() || "",
            notes: "",
          });
          toast({ title: "Spend logged" });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this entry?")) {
      deleteTransaction.mutate(id, {
        onSuccess: () => toast({ title: "Entry deleted" }),
        onError: () => toast({ title: "Error", description: "Failed to delete", variant: "destructive" }),
      });
    }
  };

  const isLoading = accountsLoading || transactionsLoading;

  if (isLoading) {
    return (
      <Layout title="Spending">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const thisWeekSpending = transactions
    ?.filter(t => {
      const date = new Date(t.date);
      return date >= thisWeekStart && date <= thisWeekEnd;
    })
    .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

  const getAccountName = (accountId: number | null) => {
    if (!accountId) return "Unknown";
    return accounts?.find(a => a.id === accountId)?.name || "Unknown";
  };

  return (
    <Layout title="Spending">
      <div className="max-w-md mx-auto space-y-8 pb-24 px-4">
        <Card className="border-gold/30 bg-card shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">This Week</p>
                <p className="text-2xl font-bold font-mono text-gold">${thisWeekSpending.toFixed(2)}</p>
              </div>
              <Wallet className="w-8 h-8 text-gold/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-gold">
              <Plus className="w-5 h-5" /> Log Spending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="h-11 rounded-xl bg-secondary border-border text-foreground" data-testid="input-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} className="h-11 rounded-xl bg-secondary border-border text-gold font-bold text-lg" data-testid="input-amount" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fromAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Pay From</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-secondary border-border h-11 rounded-xl text-foreground" data-testid="select-account">
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover border-popover-border">
                          {checkingAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id.toString()}>
                              {account.name} (${account.currentBalance.toFixed(2)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-secondary border-border h-11 rounded-xl text-foreground" data-testid="select-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover border-popover-border">
                          <SelectItem value="Groceries">Groceries</SelectItem>
                          <SelectItem value="Gas / Fuel">Gas / Fuel</SelectItem>
                          <SelectItem value="Personal (Me)">Personal (Me)</SelectItem>
                          <SelectItem value="Personal (Spouse)">Personal (Spouse)</SelectItem>
                          <SelectItem value="Household / Misc">Household / Misc</SelectItem>
                          <SelectItem value="Dining Out">Dining Out</SelectItem>
                          <SelectItem value="Entertainment">Entertainment</SelectItem>
                          <SelectItem value="Subscriptions">Subscriptions</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Notes (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Extra details..." {...field} className="h-11 rounded-xl bg-secondary border-border text-foreground" data-testid="input-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:opacity-90 transition-opacity" disabled={createTransaction.isPending} data-testid="btn-submit">
                  {createTransaction.isPending ? "Saving..." : "Save Spend"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2 px-1">
            <Receipt className="w-4 h-4" />
            Recent Spending
          </h3>
          <div className="space-y-3">
            {transactions?.slice(0, 20).map((entry) => (
              <Card key={entry.id} className="border-border bg-card shadow-md overflow-hidden hover:border-primary/20 transition-colors" data-testid={`spending-entry-${entry.id}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-foreground">{entry.category || "Uncategorized"}</span>
                      <span className="text-[9px] bg-secondary border border-border px-2 py-0.5 rounded-full font-bold text-muted-foreground uppercase tracking-wider">
                        {getAccountName(entry.fromAccountId)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                        {format(new Date(entry.date), "MMM d, yyyy")}
                      </span>
                      {entry.notes && <span className="text-[11px] text-muted-foreground italic leading-tight">"{entry.notes}"</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-gold text-xl">${parseFloat(entry.amount).toFixed(2)}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 text-muted-foreground/30 hover:text-destructive hover:bg-destructive/5"
                      onClick={() => handleDelete(entry.id)}
                      data-testid={`btn-delete-${entry.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!transactions || transactions.length === 0) && (
              <p className="text-center py-12 text-xs text-muted-foreground italic uppercase tracking-widest">No spending logged yet.</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
