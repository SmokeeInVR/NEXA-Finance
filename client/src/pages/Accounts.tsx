import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useDebts, useCreateDebt, useDeleteDebt, useUpdateDebt } from "@/hooks/use-debts";
import { useAccountsWithBalances, useUpdateAccount, useSeedAccounts } from "@/hooks/use-accounts";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDebtSchema, type InsertDebt, type AccountBalance } from "@shared/schema";
import { z } from "zod";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { format, addMonths, formatDistanceToNow } from "date-fns";
import {
  Loader2,
  Wallet,
  Plus,
  Save,
  Clock,
  CreditCard,
  Trash2,
  Calendar,
  AlertTriangle,
  TrendingDown,
  RefreshCw,
  ArrowRightLeft,
  DollarSign,
  MinusCircle,
  Target,
  Pencil,
} from "lucide-react";
import { Label } from "@/components/ui/label";

const updateBalanceSchema = z.object({
  balance: z.string().min(1, "Balance is required"),
});

function BalancesTab() {
  const { toast } = useToast();
  const [editingBalance, setEditingBalance] = useState<{ id: number; value: string } | null>(null);
  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDate, setTransferDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [transferNote, setTransferNote] = useState("");
  const [transferCreatedBy, setTransferCreatedBy] = useState("Me");
  const [bufferGoalInput, setBufferGoalInput] = useState("1000");

  const { data: accounts, isLoading } = useAccountsWithBalances();
  
  const { data: settings } = useQuery<any>({
    queryKey: ["/api/budget-settings"],
  });
  
  const updateSettings = useMutation({
    mutationFn: async (data: { bufferGoalAmount: string }) => {
      const res = await apiRequest("POST", "/api/budget-settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budget-settings"] });
      toast({ title: "Saved", description: "Buffer goal updated." });
    },
  });
  
  const bufferBalance = accounts?.find((a: any) => a.name === "Emergency Buffer")?.currentBalance || 0;
  const bufferGoalAmount = parseFloat(settings?.bufferGoalAmount?.toString() || bufferGoalInput);
  const bufferRemaining = Math.max(0, bufferGoalAmount - bufferBalance);
  const updateAccount = useUpdateAccount();
  const seedAccounts = useSeedAccounts();

  const { data: recentTransfers, isLoading: transfersLoading } = useQuery<any[]>({
    queryKey: ["/api/transfers"],
  });

  const createTransfer = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/transfers", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transfers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts/with-balances"] });
      toast({ title: "Transfer Recorded", description: "Balances updated" });
      setTransferFrom("");
      setTransferTo("");
      setTransferAmount("");
      setTransferNote("");
      setTransferDate(format(new Date(), "yyyy-MM-dd"));
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to record transfer", variant: "destructive" });
    }
  });

  const handleTransfer = () => {
    if (!transferFrom || !transferTo || !transferAmount) {
      toast({ title: "Missing Fields", description: "Please fill all required fields", variant: "destructive" });
      return;
    }
    if (transferFrom === transferTo) {
      toast({ title: "Invalid", description: "From and To accounts must be different", variant: "destructive" });
      return;
    }
    const amount = parseFloat(transferAmount);
    if (amount <= 0) {
      toast({ title: "Invalid Amount", description: "Amount must be greater than zero", variant: "destructive" });
      return;
    }

    createTransfer.mutate({
      date: transferDate,
      fromAccountId: parseInt(transferFrom),
      toAccountId: parseInt(transferTo),
      amount: transferAmount,
      note: transferNote || null,
      createdBy: transferCreatedBy
    });
  };

  const getAccountName = (id: number) => {
    return accounts?.find(a => a.id === id)?.name || "Unknown";
  };

  const handleSaveBalance = (accountId: number, desiredBalance: string) => {
    const account = accounts?.find(a => a.id === accountId);
    if (!account) return;
    const parsed = parseFloat(desiredBalance);
    if (isNaN(parsed)) {
      toast({ title: "Invalid Amount", description: "Please enter a valid number", variant: "destructive" });
      return;
    }
    const currentStarting = parseFloat(account.startingBalance || "0");
    const currentDerived = account.currentBalance;
    const transactionDelta = currentDerived - currentStarting;
    const newStartingBalance = parsed - transactionDelta;
    updateAccount.mutate(
      { id: accountId, startingBalance: newStartingBalance.toFixed(2) },
      {
        onSuccess: () => {
          toast({ title: "Balance Updated" });
          setEditingBalance(null);
        },
        onError: () => toast({ title: "Error", description: "Failed to update", variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-6 text-center">
          <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No accounts set up yet</p>
          <Button onClick={() => seedAccounts.mutate()} disabled={seedAccounts.isPending}>
            {seedAccounts.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Create Default Accounts
          </Button>
        </CardContent>
      </Card>
    );
  }

  const bankAccounts = accounts.filter(a => ["personal", "spouse", "joint", "business"].includes(a.type));
  // Exclude Bills Pool from bucket display (excludeFromTotals = true)
  const bucketAccounts = accounts.filter(a => a.type === "bucket" && !a.excludeFromTotals);
  const totalBankBalance = bankAccounts.filter(a => a.type !== "business").reduce((sum, a) => sum + a.currentBalance, 0);
  const totalBucketBalance = bucketAccounts.reduce((sum, a) => sum + a.currentBalance, 0);
  const allAccounts = [...bankAccounts.filter(a => a.type !== "business"), ...bucketAccounts];

  return (
    <div className="space-y-4">
      {/* Transfer Money Card */}
      <Card className="border-border bg-card shadow-lg">
        <CardHeader className="pb-3 border-b border-border bg-secondary/20">
          <CardTitle className="text-lg flex items-center gap-2 text-gold">
            <ArrowRightLeft className="w-5 h-5" /> Transfer Money
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">From Account</label>
              <Select value={transferFrom} onValueChange={setTransferFrom}>
                <SelectTrigger className="bg-background" data-testid="select-from-account">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {allAccounts.map(acc => (
                    <SelectItem key={acc.id} value={String(acc.id)}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">To Account</label>
              <Select value={transferTo} onValueChange={setTransferTo}>
                <SelectTrigger className="bg-background" data-testid="select-to-account">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {allAccounts.map(acc => (
                    <SelectItem key={acc.id} value={String(acc.id)}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Amount</label>
              <div className="relative">
                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gold" />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="pl-7 bg-background font-mono"
                  data-testid="input-transfer-amount"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Date</label>
              <Input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="bg-background"
                data-testid="input-transfer-date"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Note (optional)</label>
              <Input
                placeholder="e.g. Savings contribution"
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
                className="bg-background"
                data-testid="input-transfer-note"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Created By</label>
              <Select value={transferCreatedBy} onValueChange={setTransferCreatedBy}>
                <SelectTrigger className="bg-background" data-testid="select-created-by">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Me">Me</SelectItem>
                  <SelectItem value="Spouse">Spouse</SelectItem>
                  <SelectItem value="Joint">Joint</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button 
            onClick={handleTransfer} 
            disabled={createTransfer.isPending}
            className="w-full"
            data-testid="btn-record-transfer"
          >
            {createTransfer.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRightLeft className="w-4 h-4 mr-2" />}
            Record Transfer
          </Button>

          {/* Recent Transfers */}
          {recentTransfers && recentTransfers.length > 0 && (
            <div className="pt-3 border-t border-border">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Recent Transfers</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {recentTransfers.slice(0, 10).map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between text-sm p-2 rounded bg-secondary/20" data-testid={`transfer-row-${t.id}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {getAccountName(t.fromAccountId)} → {getAccountName(t.toAccountId)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {t.date} • {t.createdBy}
                      </p>
                    </div>
                    <p className="text-gold font-mono font-bold ml-2">
                      ${parseFloat(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bank Accounts Card */}
      <Card className="border-border bg-card shadow-lg">
        <CardHeader className="pb-3 border-b border-border bg-secondary/20">
          <CardTitle className="text-lg flex items-center gap-2 text-gold">
            <Wallet className="w-5 h-5" /> Bank Accounts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {bankAccounts.filter(a => a.type !== "business").map((account) => (
            <div
              key={account.id}
              data-testid={`balance-row-${account.id}`}
              className={`p-4 rounded-xl border transition-all ${
                editingBalance?.id === account.id ? "border-gold bg-gold/5" : "border-border bg-secondary/20"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{account.name}</p>
                </div>
                <div className="text-right">
                  {editingBalance?.id === account.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-gold">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        className="w-24 h-8 text-right font-mono font-bold bg-background text-gold"
                        value={editingBalance.value}
                        onChange={(e) => setEditingBalance({ id: account.id, value: e.target.value })}
                        autoFocus
                        data-testid={`input-balance-${account.id}`}
                      />
                      <Button 
                        size="sm" 
                        onClick={() => handleSaveBalance(account.id, editingBalance.value)} 
                        disabled={updateAccount.isPending}
                        className="h-8 px-2"
                        data-testid={`btn-save-${account.id}`}
                      >
                        <Save className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 justify-end">
                      <div>
                        <p 
                          className={`text-xl font-bold font-mono cursor-pointer ${account.currentBalance >= 0 ? "text-gold" : "text-destructive"}`}
                          onClick={() => setEditingBalance({ id: account.id, value: account.currentBalance.toFixed(2) })}
                          data-testid={`text-balance-${account.id}`}
                        >
                          ${account.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Current Balance</p>
                      </div>
                      <button
                        onClick={() => setEditingBalance({ id: account.id, value: account.currentBalance.toFixed(2) })}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-gold hover:bg-gold/10 transition-colors"
                        data-testid={`btn-edit-${account.id}`}
                        title="Edit balance"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Buckets & Set-Asides Card */}
      <Card className="border-border bg-card shadow-lg">
        <CardHeader className="pb-3 border-b border-border bg-secondary/20">
          <CardTitle className="text-lg flex items-center gap-2 text-gold">
            <CreditCard className="w-5 h-5" /> Buckets & Set-Asides
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {bucketAccounts.map((account) => (
            <div
              key={account.id}
              data-testid={`bucket-row-${account.id}`}
              className={`p-4 rounded-xl border transition-all ${
                editingBalance?.id === account.id ? "border-gold bg-gold/5" : "border-border bg-secondary/20"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{account.name}</p>
                </div>
                <div className="text-right">
                  {editingBalance?.id === account.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-gold">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        className="w-24 h-8 text-right font-mono font-bold bg-background text-gold"
                        value={editingBalance.value}
                        onChange={(e) => setEditingBalance({ id: account.id, value: e.target.value })}
                        autoFocus
                        data-testid={`input-bucket-${account.id}`}
                      />
                      <Button 
                        size="sm" 
                        onClick={() => handleSaveBalance(account.id, editingBalance.value)} 
                        disabled={updateAccount.isPending}
                        className="h-8 px-2"
                        data-testid={`btn-save-bucket-${account.id}`}
                      >
                        <Save className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 justify-end">
                      <div>
                        <p 
                          className={`text-xl font-bold font-mono cursor-pointer ${account.currentBalance >= 0 ? "text-gold" : "text-destructive"}`}
                          onClick={() => setEditingBalance({ id: account.id, value: account.currentBalance.toFixed(2) })}
                          data-testid={`text-bucket-${account.id}`}
                        >
                          ${account.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <button
                        onClick={() => setEditingBalance({ id: account.id, value: account.currentBalance.toFixed(2) })}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-gold hover:bg-gold/10 transition-colors"
                        data-testid={`btn-edit-bucket-${account.id}`}
                        title="Edit balance"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Totals Row */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border bg-card shadow-lg">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase">Total Bank</p>
            <p className={`text-xl font-bold font-mono ${totalBankBalance >= 0 ? "text-gold" : "text-destructive"}`}>
              ${totalBankBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-lg">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase">Total Buckets</p>
            <p className={`text-xl font-bold font-mono ${totalBucketBalance >= 0 ? "text-gold" : "text-destructive"}`}>
              ${totalBucketBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Buffer Goal Tracker */}
      <Card className="border-border bg-card shadow-lg">
        <CardHeader className="pb-3 border-b border-border bg-secondary/20">
          <CardTitle className="text-lg flex items-center gap-2 text-gold">
            <Target className="w-5 h-5" /> Buffer Goal Tracker
          </CardTitle>
          <p className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Emergency fund progress</p>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Current Balance</Label>
              <p data-testid="text-buffer-balance" className="text-2xl font-bold font-mono text-foreground">${bufferBalance.toFixed(0)}</p>
            </div>
            <div className="space-y-1 text-right">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Remaining</Label>
              <p data-testid="text-buffer-remaining" className={`text-2xl font-bold font-mono ${bufferRemaining > 0 ? 'text-gold' : 'text-success'}`}>
                ${bufferRemaining.toFixed(0)}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Goal Amount</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-xs text-gold hover:bg-gold/10" 
                onClick={() => updateSettings.mutate({ bufferGoalAmount: bufferGoalInput })}
                disabled={updateSettings.isPending}
                data-testid="button-save-buffer-goal"
              >
                <Save className="w-3 h-3 mr-1" /> Save
              </Button>
            </div>
            <Input 
              type="number" 
              className="h-11 bg-secondary border-border text-lg font-bold text-foreground" 
              value={bufferGoalInput}
              onChange={(e) => setBufferGoalInput(e.target.value)}
              data-testid="input-buffer-goal"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DebtsTab() {
  const { data: debts, isLoading } = useDebts();
  const createDebt = useCreateDebt();
  const deleteDebt = useDeleteDebt();
  const updateDebt = useUpdateDebt();
  const [isOpen, setIsOpen] = useState(false);
  const [updateDialogId, setUpdateDialogId] = useState<number | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<{ debtId: number; debtName: string; monthlyPayment: string } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const { toast } = useToast();

  const { data: accounts } = useAccountsWithBalances();
  const createTransaction = useCreateTransaction();
  const checkingAccounts = accounts?.filter(a => ["personal", "spouse", "joint"].includes(a.type)) || [];

  const updateForm = useForm<z.infer<typeof updateBalanceSchema>>({
    resolver: zodResolver(updateBalanceSchema),
    defaultValues: { balance: "" },
  });

  const form = useForm<InsertDebt>({
    resolver: zodResolver(insertDebtSchema),
    defaultValues: { name: "", balance: "", apr: "", monthlyPayment: "" },
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

  const openPaymentDialog = (debtId: number, debtName: string, monthlyPayment: string) => {
    setPaymentDialog({ debtId, debtName, monthlyPayment });
    setPaymentAmount(monthlyPayment);
    setPaymentAccountId(checkingAccounts[0]?.id.toString() || "");
  };

  const handleMakePayment = async () => {
    if (!paymentDialog || !paymentAmount || !paymentAccountId) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Error", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    const debt = debts?.find(d => d.id === paymentDialog.debtId);
    if (!debt) return;

    const newBalance = Math.max(0, parseFloat(debt.balance) - amount).toFixed(2);

    createTransaction.mutate(
      {
        date: format(new Date(), "yyyy-MM-dd"),
        type: "debt_payment",
        amount: paymentAmount,
        fromAccountId: parseInt(paymentAccountId),
        debtId: paymentDialog.debtId,
        notes: `Payment to ${paymentDialog.debtName}`,
        createdBy: "Me",
      },
      {
        onSuccess: () => {
          updateDebt.mutate({ id: paymentDialog.debtId, balance: newBalance });
          toast({ title: "Payment Made", description: `Paid $${amount.toFixed(2)} toward ${paymentDialog.debtName}` });
          setPaymentDialog(null);
          setPaymentAmount("");
          setPaymentAccountId("");
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button data-testid="button-add-debt" size="lg" className="w-full rounded-xl font-bold shadow-lg">
            <Plus className="w-5 h-5 mr-2" /> Add New Debt
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm rounded-2xl bg-card border-border">
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
        <DialogContent data-testid="dialog-update-balance" className="max-w-sm rounded-2xl bg-card border-border">
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
                        <Input data-testid="input-new-balance" type="number" step="0.01" className="font-mono font-bold" {...field} />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button data-testid="button-save-balance" type="submit" disabled={updateDebt.isPending} size="lg" className="w-full rounded-xl bg-gold text-black font-bold">
                {updateDebt.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <RefreshCw className="w-5 h-5 mr-2" />}
                Save New Balance
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!paymentDialog} onOpenChange={(open) => { if (!open) { setPaymentDialog(null); setPaymentAmount(""); setPaymentAccountId(""); } }}>
        <DialogContent data-testid="dialog-make-payment" className="max-w-sm rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-gold">Make Payment - {paymentDialog?.debtName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">Payment Amount</label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-lg">$</span>
                <Input
                  data-testid="input-payment-amount"
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="font-mono font-bold"
                />
              </div>
            </div>
            <div>
              <label className="text-muted-foreground uppercase text-[10px] font-bold tracking-widest">Pay From Account</label>
              <Select value={paymentAccountId} onValueChange={setPaymentAccountId}>
                <SelectTrigger className="bg-background" data-testid="select-payment-account">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {checkingAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.name} (${account.currentBalance.toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              data-testid="button-confirm-payment"
              onClick={handleMakePayment}
              disabled={createTransaction.isPending}
              size="lg"
              className="w-full rounded-xl bg-success text-success-foreground font-bold"
            >
              {createTransaction.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <DollarSign className="w-5 h-5 mr-2" />}
              Make Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {debts?.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border">
          <TrendingDown className="w-12 h-12 mx-auto text-muted-foreground/20 mb-2" />
          <p className="text-muted-foreground font-medium">No debts tracked yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Total Debt Summary Card */}
          <Card className="bg-gradient-to-r from-destructive/20 to-destructive/10 border-destructive/30">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mb-1">Total Debt</p>
                  <p data-testid="text-total-debt" className="text-3xl font-bold font-mono text-destructive">
                    ${(debts ?? []).reduce((sum, d) => sum + parseFloat(d.balance), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] mb-1">{(debts ?? []).length} {(debts ?? []).length === 1 ? 'Debt' : 'Debts'}</p>
                  <p className="text-lg font-bold font-mono text-muted-foreground">
                    ${(debts ?? []).reduce((sum, d) => sum + parseFloat(d.monthlyPayment), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
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

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        data-testid={`button-make-payment-${debt.id}`}
                        className="bg-success text-success-foreground font-bold"
                        onClick={() => openPaymentDialog(debt.id, debt.name, debt.monthlyPayment)}
                      >
                        <DollarSign className="w-4 h-4 mr-1" /> Pay
                      </Button>
                      <Button
                        data-testid={`button-update-balance-${debt.id}`}
                        variant="outline"
                        className="border-border"
                        onClick={() => openUpdateDialog(debt.id, debt.balance)}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" /> Update
                      </Button>
                    </div>
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
  );
}

export default function Accounts() {
  const [activeTab, setActiveTab] = useState("balances");

  return (
    <Layout title="Accounts">
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-secondary border border-border rounded-xl">
            <TabsTrigger 
              value="balances" 
              className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold flex items-center gap-2"
            >
              <Wallet className="w-4 h-4" /> Balances
            </TabsTrigger>
            <TabsTrigger 
              value="debts" 
              className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" /> Debts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="balances" className="mt-4">
            <BalancesTab />
          </TabsContent>

          <TabsContent value="debts" className="mt-4">
            <DebtsTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
