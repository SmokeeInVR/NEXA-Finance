import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet, Plus, Save, Clock } from "lucide-react";
import type { AccountBalance } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

export default function Balances() {
  const { toast } = useToast();
  const [editedBalances, setEditedBalances] = useState<Record<string, string>>({});
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  const { data: balances, isLoading } = useQuery<AccountBalance[]>({
    queryKey: ["/api/balances"],
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: { name: string; balance: string }[]) => {
      return apiRequest("POST", "/api/balances", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
      setEditedBalances({});
      toast({
        title: "Balances Updated",
        description: "Your account balances have been saved.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to update balances",
        variant: "destructive",
      });
    },
  });

  const handleBalanceChange = (name: string, value: string) => {
    setEditedBalances((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuickAdd = (amount: number) => {
    if (!selectedAccount) return;
    const currentBalance = editedBalances[selectedAccount] ?? 
      balances?.find(b => b.name === selectedAccount)?.balance ?? "0";
    const newBalance = (parseFloat(currentBalance) + amount).toFixed(2);
    setEditedBalances((prev) => ({ ...prev, [selectedAccount]: newBalance }));
  };

  const handleSaveAll = () => {
    const updates = Object.entries(editedBalances).map(([name, balance]) => ({
      name,
      balance,
    }));
    if (updates.length > 0) {
      updateMutation.mutate(updates);
    }
  };

  const hasChanges = Object.keys(editedBalances).length > 0;

  if (isLoading) {
    return (
      <Layout title="Balances">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const getDisplayBalance = (account: AccountBalance) => {
    return editedBalances[account.name] ?? account.balance;
  };

  return (
    <Layout title="Balances">
      <div className="space-y-4">
        <Card className="border-border bg-card shadow-lg">
          <CardHeader className="pb-3 border-b border-border bg-secondary/20">
            <CardTitle className="text-lg flex items-center gap-2 text-gold">
              <Wallet className="w-5 h-5" /> Household Account Balances
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {balances?.map((account) => (
              <div
                key={account.id}
                data-testid={`balance-row-${account.name.toLowerCase().replace(/\s+/g, "-")}`}
                className={`p-4 rounded-xl border transition-all ${
                  selectedAccount === account.name
                    ? "border-gold bg-gold/5"
                    : "border-border bg-secondary/20"
                }`}
                onClick={() => setSelectedAccount(account.name)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{account.name}</p>
                    {account.updatedAt && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        Updated {formatDistanceToNow(new Date(account.updatedAt), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-lg">$</span>
                    <Input
                      data-testid={`input-balance-${account.name.toLowerCase().replace(/\s+/g, "-")}`}
                      type="number"
                      step="0.01"
                      className="w-28 h-10 text-right font-mono font-bold text-lg bg-background border-border"
                      value={getDisplayBalance(account)}
                      onChange={(e) => handleBalanceChange(account.name, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {selectedAccount && (
          <Card className="border-border bg-card shadow-lg">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Quick Add to {selectedAccount}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="flex gap-2 flex-wrap">
                {[100, 500, 1000, 2500].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    data-testid={`button-quick-add-${amount}`}
                    className="flex-1 min-w-[70px] border-border text-foreground hover:bg-gold/10 hover:text-gold hover:border-gold"
                    onClick={() => handleQuickAdd(amount)}
                  >
                    <Plus className="w-3 h-3 mr-1" />${amount}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {hasChanges && (
          <div className="sticky bottom-20 z-40">
            <Button
              data-testid="button-save-balances"
              className="w-full h-12 bg-gold hover:bg-gold/90 text-black font-bold text-base shadow-lg"
              onClick={handleSaveAll}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Save className="w-5 h-5 mr-2" />
              )}
              Save All Changes
            </Button>
          </div>
        )}

        <Card className="border-border bg-card shadow-lg">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Total Cash</span>
              <span className="text-xl font-bold font-mono text-gold">
                ${balances
                  ?.filter((b) => b.name !== "Trading")
                  .reduce((acc, b) => acc + parseFloat(b.balance), 0)
                  .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Excludes Trading account</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
