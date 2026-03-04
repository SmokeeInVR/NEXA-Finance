import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useDebts, useCreateDebt, useDeleteDebt, useUpdateDebt } from "@/hooks/use-debts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, Calendar, AlertTriangle, TrendingDown, RefreshCw, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDebtSchema, type InsertDebt } from "@shared/schema";
import { format, addMonths } from "date-fns";
import { z } from "zod";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { useToast } from "@/hooks/use-toast";

const updateBalanceSchema = z.object({
  balance: z.string().min(1, "Balance is required"),
});

export default function Debts() {
  const { data: debts, isLoading } = useDebts();
  const createDebt = useCreateDebt();
  const deleteDebt = useDeleteDebt();
  const updateDebt = useUpdateDebt();
  const [isOpen, setIsOpen] = useState(false);
  const [updateDialogId, setUpdateDialogId] = useState<number | null>(null);
  const { toast } = useToast();

  const updateForm = useForm<z.infer<typeof updateBalanceSchema>>({
    resolver: zodResolver(updateBalanceSchema),
    defaultValues: { balance: "" },
  });

  const form = useForm<InsertDebt>({
    resolver: zodResolver(insertDebtSchema),
    defaultValues: {
      name: "",
      balance: "",
      apr: "",
      monthlyPayment: "",
    },
  });

  const onSubmit = async (data: InsertDebt) => {
    try {
      await createDebt.mutateAsync(data);
      setIsOpen(false);
      form.reset();
      toast({ title: "Debt Added", description: "Your debt tracking is updated." });
    } catch (e) {
      toast({ title: "Error", description: "Could not add debt.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this debt?")) {
      await deleteDebt.mutateAsync(id);
      toast({ title: "Deleted", description: "Debt removed." });
    }
  };

  const handleUpdateBalance = async (data: z.infer<typeof updateBalanceSchema>) => {
    if (updateDialogId === null) return;
    try {
      await updateDebt.mutateAsync({ id: updateDialogId, balance: data.balance });
      setUpdateDialogId(null);
      updateForm.reset();
      toast({ title: "Balance Updated", description: "Debt balance has been updated." });
    } catch (e) {
      toast({ title: "Error", description: "Could not update balance.", variant: "destructive" });
    }
  };

  const openUpdateDialog = (id: number, currentBalance: string) => {
    setUpdateDialogId(id);
    updateForm.setValue("balance", currentBalance);
  };

  return (
    <Layout title="Debt Payoff">
      <div className="space-y-4">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-debt" size="lg" className="w-full rounded-xl font-bold shadow-lg">
              <Plus className="w-5 h-5 mr-2" /> Add New Debt
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-gold">Add Debt Details</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">Debt Name</FormLabel>
                      <FormControl>
                        <Input data-testid="input-debt-name" placeholder="e.g. Visa Card" {...field} className="font-medium" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <MoneyInput label="Current Balance" {...form.register("balance")} />
                <div className="grid grid-cols-2 gap-4">
                  <MoneyInput label="APR %" {...form.register("apr")} />
                  <MoneyInput label="Monthly Payment" {...form.register("monthlyPayment")} />
                </div>
                <Button data-testid="button-submit-debt" type="submit" size="lg" disabled={createDebt.isPending} className="w-full rounded-xl mt-2 font-bold">
                  {createDebt.isPending ? "Adding..." : "Add Debt"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={updateDialogId !== null} onOpenChange={(open) => { if (!open) { setUpdateDialogId(null); updateForm.reset(); } }}>
          <DialogContent data-testid="dialog-update-balance" className="sm:max-w-sm rounded-2xl bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-gold">Update Balance</DialogTitle>
            </DialogHeader>
            <Form {...updateForm}>
              <form onSubmit={updateForm.handleSubmit(handleUpdateBalance)} className="space-y-4 pt-4">
                <FormField
                  control={updateForm.control}
                  name="balance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">New Current Balance</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-lg">$</span>
                          <Input
                            data-testid="input-new-balance"
                            type="number"
                            step="0.01"
                            className="font-mono font-bold"
                            {...field}
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button
                  data-testid="button-save-balance"
                  type="submit"
                  disabled={updateDebt.isPending}
                  size="lg"
                  className="w-full rounded-xl bg-gold text-black font-bold"
                >
                  {updateDebt.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="w-5 h-5 mr-2" />
                  )}
                  Save New Balance
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground">Loading debts...</div>
        ) : debts?.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border">
            <TrendingDown className="w-12 h-12 mx-auto text-muted-foreground/20 mb-2" />
            <p className="text-muted-foreground font-medium">No debts tracked yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {debts?.map((debt) => {
              const balance = parseFloat(debt.balance);
              const startingBalance = parseFloat(debt.startingBalance || debt.balance);
              const apr = parseFloat(debt.apr || "0");
              const payment = parseFloat(debt.monthlyPayment);
              
              const paidSoFar = Math.max(0, startingBalance - balance);
              const percentPaid = startingBalance > 0 ? (paidSoFar / startingBalance) * 100 : 0;
              
              const monthsRemaining = payment > 0 ? Math.ceil(balance / payment) : Infinity;
              const payoffDate = monthsRemaining !== Infinity ? addMonths(new Date(), monthsRemaining) : null;
              const noPayment = payment === 0;

              return (
                <Card key={debt.id} data-testid={`debt-card-${debt.id}`} className="overflow-hidden border-border bg-card shadow-lg">
                  <CardContent className="p-0">
                    <div className="bg-primary p-4 flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg text-primary-foreground uppercase tracking-tight">{debt.name}</h3>
                        <p className="text-[10px] text-primary-foreground/70 font-bold tracking-widest uppercase mt-1">
                          {apr > 0 ? `${apr}% APR` : "0% APR"}
                        </p>
                      </div>
                      <Button data-testid={`button-delete-debt-${debt.id}`} variant="ghost" size="icon" className="text-primary-foreground/50 -mt-1 -mr-2" onClick={() => handleDelete(debt.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="p-5 space-y-4 bg-card">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mb-1">Current Balance</p>
                          <p data-testid={`debt-balance-${debt.id}`} className="text-2xl font-bold font-mono text-white">${balance.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mb-1">Monthly Payment</p>
                          <p data-testid={`debt-payment-${debt.id}`} className="text-2xl font-bold font-mono text-white">${payment.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Progress</span>
                          <span data-testid={`debt-percent-${debt.id}`} className="text-sm font-bold font-mono text-gold">{percentPaid.toFixed(1)}% paid</span>
                        </div>
                        <Progress data-testid={`debt-progress-${debt.id}`} value={percentPaid} className="h-3" />
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Starting</p>
                            <p data-testid={`debt-starting-${debt.id}`} className="font-mono font-bold text-foreground">${startingBalance.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Paid So Far</p>
                            <p data-testid={`debt-paid-${debt.id}`} className="font-mono font-bold text-success">${paidSoFar.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>

                      <Button
                        data-testid={`button-update-balance-${debt.id}`}
                        variant="outline"
                        className="w-full border-border"
                        onClick={() => openUpdateDialog(debt.id, debt.balance)}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" /> Update Balance
                      </Button>
                    </div>

                    <div className="px-5 pb-5 bg-card">
                      {noPayment ? (
                        <div data-testid={`debt-no-payment-warning-${debt.id}`} className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-xl flex items-center gap-3 text-xs font-bold uppercase tracking-wide">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>No monthly payment set</span>
                        </div>
                      ) : (
                        <div className="bg-success/10 border border-success/20 p-4 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2 text-success">
                            <Calendar className="w-4 h-4" />
                            <span data-testid={`debt-payoff-date-${debt.id}`} className="text-sm font-bold uppercase tracking-tight">
                              Free by {payoffDate ? format(payoffDate, "MMM yyyy") : "..."}
                            </span>
                          </div>
                          <span data-testid={`debt-months-${debt.id}`} className="text-xs font-bold bg-success text-success-foreground px-3 py-1 rounded-full uppercase tracking-widest">
                            {monthsRemaining} mo
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
